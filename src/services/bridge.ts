import {
    AddNoteResponse,
    NotesInfoResponseEntity,
    UpdateNoteFieldsResponse,
} from 'ankibridge/entities/network'
import { NoteAction, NoteField, NoteFields } from 'ankibridge/entities/note'
import AnkiBridgePlugin from 'ankibridge/main'
import { hasID, NoteBase, NoteWithID } from 'ankibridge/notes/base'
import { BasicNote } from 'ankibridge/notes/basic'
import { ReciteNote } from 'ankibridge/notes/recite'
import { getProcessorById } from 'ankibridge/processors'
import { ProcessorContext } from 'ankibridge/processors/base'
import { processMarkdownToHtml } from 'ankibridge/processors/html'
import { Postprocessor } from 'ankibridge/processors/postprocessors/base'
import { Preprocessor } from 'ankibridge/processors/preprocessors/base'
import { ProcessedFileResult } from 'ankibridge/services/reader'
import { toReciteCards } from 'ankibridge/utils/recite'
import _ from 'lodash'
import { App, Notice } from 'obsidian'
import promiseAllProperties from 'promise-all-properties'

class NotePairDelta {
    constructor(
        public shouldChangeModel: boolean = false,
        public shouldUpdateFields: boolean = false,
        public shouldUpdateTags: boolean = false,
        public cardsToUpdate: Array<number> = [],
    ) {}

    public shouldUpdate(): boolean {
        return (
            this.shouldChangeModel ||
            this.shouldUpdateFields ||
            this.shouldUpdateTags ||
            !_.isEmpty(this.cardsToUpdate)
        )
    }
}

export class Bridge {
    private preprocessors: Array<Preprocessor> = []
    private postprocessors: Array<Postprocessor> = []

    constructor(public app: App, public plugin: AnkiBridgePlugin) {
        for (const [id, enabled] of Object.entries(this.plugin.settings.getMergedProcessors())) {
            if (enabled) {
                const processorClass = getProcessorById(id)
                const processor = new processorClass(this.app, this.plugin)

                if (processor instanceof Preprocessor) {
                    this.preprocessors.push(processor)
                } else {
                    this.postprocessors.push(processor)
                }
            }
        }

        // Sort processors
        this.preprocessors = _.sortBy(this.preprocessors, [
            (o) => {
                return Object.getPrototypeOf(o).constructor.weight
            },
        ])
        this.postprocessors = _.sortBy(this.postprocessors, [
            (o) => {
                return Object.getPrototypeOf(o).constructor.weight
            },
        ])
    }

    public async processField(
        note: NoteBase,
        field: string | null,
        ctx: ProcessorContext,
    ): Promise<string> {
        // Do all Markdown preprocessing
        for (const pp of this.preprocessors) {
            field = await pp.preprocess(note, field, ctx)
        }
        // Convert to HTML DOM
        const domField = await processMarkdownToHtml(note, field, ctx)

        // Do all HTML postprocessing
        for (const pp of this.postprocessors) {
            await pp.postprocess(note, domField, ctx)
        }

        // Turn back into string
        return domField.innerHTML
    }

    public async renderFields(note: NoteBase): Promise<NoteFields> {
        const promisedTransforms = _.transform(
            note.fields,
            (result: Record<NoteField, Promise<string>>, field, noteField: NoteField) => {
                const ctx: ProcessorContext = {
                    noteField: noteField,
                }

                result[noteField] = this.processField(note, field, ctx)
            },
        )

        return await promiseAllProperties(promisedTransforms)
    }

    private async notePairChanges(
        note: NoteBase,
        noteInfo: NotesInfoResponseEntity,
        renderedNote?: NoteFields,
    ): Promise<NotePairDelta> {
        const delta = new NotePairDelta()

        if (renderedNote === undefined) {
            renderedNote = await this.renderFields(note)
        }

        // Check that model is the same
        if (note.getModelName() !== noteInfo.modelName) {
            delta.shouldChangeModel = true

            // Return early since model change requires recreation anyway
            return delta
        }

        // Check that fields are the same
        if (!_.isEqual(note.normaliseNoteInfoFields(noteInfo), renderedNote)) {
            delta.shouldUpdateFields = true
        }

        // Check that tags are the same
        const sourceTags = note.getTags(this.plugin)
        if (!_.isEqual(_.sortBy(sourceTags), _.sortBy(noteInfo.tags))) {
            delta.shouldUpdateTags = true
        }

        // Cannot actually update modelName - skip checking
        const cardsInfos = await this.plugin.anki.cardsInfo(noteInfo.cards)
        const cardsInfosToUpdate = _.filter(cardsInfos, (value) => {
            return value.deckName.toLowerCase() !== note.getDeckName(this.plugin).toLowerCase()
        })
        delta.cardsToUpdate = _.map(cardsInfosToUpdate, 'cardId')

        return delta
    }

    private displayError(e: string, note: NoteBase): void {
        new Notice(`For note with ID: ${note.id}, we got error:\n\n${_.capitalize(e)}`)
    }

    /**
     * Returns true if error is not fatal for that note
     */
    private handleError(e: string | Error, note: NoteBase): boolean {
        if (typeof e === 'string') {
            if (e.startsWith('deck was not found')) {
                this.displayError(e, note)
                return false
            } else if (e === 'cannot create note because it is a duplicate') {
                this.displayError(e, note)
                return false
            }
        } else {
            this.displayError(e.toString(), note)
            throw e // For now
            return false
        }

        throw e
    }

    private async storeMediaFiles(note: NoteBase): Promise<void> {
        // Add media files
        await Promise.all(
            note.medias.map(async (media) => {
                await this.plugin.anki.storeMediaFile(media.filename, { path: media.path })
            }),
        )
    }

    private async easyAddNote(
        note: NoteBase,
        renderedFields: NoteFields,
    ): Promise<AddNoteResponse> {
        const anki = this.plugin.anki

        const deckName = note.getDeckName(this.plugin)
        const modelName = note.getModelName()
        const tagsToSet = note.getTags(this.plugin)

        const ankiFields = note.fieldsToAnkiFields(renderedFields)

        // create deck
        await anki.createDeck(deckName)
        // Add note
        const id = await anki.addNote(note, deckName, modelName, ankiFields, tagsToSet)
        note.id = id

        // Add media files
        await this.storeMediaFiles(note)

        return id
    }

    private async easyUpdateNoteFields(
        note: NoteWithID,
        renderedFields: NoteFields,
    ): Promise<UpdateNoteFieldsResponse> {
        const anki = this.plugin.anki

        const ankiFields = note.fieldsToAnkiFields(renderedFields)
        await anki.updateNoteFields(note, ankiFields)
        await this.storeMediaFiles(note)

        return null
    }

    private buildReciteNotes(note: NoteBase): Array<ReciteNote> {
        const sourceText = note.fields[NoteField.Frontlike] || ''
        const title = note.config.title
        const contextLines = note.config.contextLines ?? 3
        const reciteLines = note.config.reciteLines ?? 2
        const cards = toReciteCards(sourceText, contextLines, reciteLines)
        const sourceIds = note.config.reciteIds || []

        const noteConfig = {
            ...note.config,
            recite: false,
            reciteIds: undefined,
        }

        return cards.map((card, idx) => {
            const reciteNote = new ReciteNote(
                note.blueprint,
                sourceIds[idx] ?? null,
                {
                    line: card.recite,
                    context: card.context,
                    title: title || '',
                    author: '',
                    sequence: String(idx + 1),
                    prompt: '',
                },
                note.source,
                note.sourceText,
                {
                    config: { ...noteConfig },
                    medias: note.medias,
                },
            )
            if (note.metadata) {
                reciteNote.setMetaData(note.metadata)
            }
            return reciteNote
        })
    }

    private reciteProxyNote(note: NoteBase, id: number): NoteWithID {
        return new BasicNote(note.blueprint, id, '', '', note.source, note.sourceText, {
            config: {
                ...note.config,
                recite: false,
                reciteIds: undefined,
            },
            medias: [],
        }) as NoteWithID
    }

    private async deleteReciteIds(note: NoteBase, ids: Array<number>): Promise<void> {
        const anki = this.plugin.anki

        for (const id of ids) {
            const proxyNote = this.reciteProxyNote(note, id)
            const noteInfo = await anki.noteInfo(proxyNote)

            if (!_.isEmpty(noteInfo)) {
                await anki.deleteNote(proxyNote)
            }
        }
    }

    private resolveBatchAction(actions: Array<NoteAction>, hadStaleDeletes: boolean): NoteAction {
        if (_.isEmpty(actions)) {
            return NoteAction.Checked
        }
        if (actions.includes(NoteAction.Recreated)) {
            return NoteAction.Recreated
        }
        if (actions.includes(NoteAction.Created)) {
            return NoteAction.Created
        }
        if (hadStaleDeletes || actions.includes(NoteAction.Updated)) {
            return NoteAction.Updated
        }
        if (actions.every((action) => action === NoteAction.Skipped)) {
            return NoteAction.Skipped
        }

        return NoteAction.Checked
    }

    private async processReciteNote(note: NoteBase): Promise<NoteAction> {
        note.id = null
        const previousIds = [...(note.config.reciteIds || [])]

        if (note.config.delete) {
            await this.deleteReciteIds(note, previousIds)
            note.config.reciteIds = []
            note.config.delete = undefined
            note.config.enabled = false
            note.id = null

            return NoteAction.Deleted
        }

        const reciteNotes = this.buildReciteNotes(note)
        const actions: Array<NoteAction> = []

        for (const reciteNote of reciteNotes) {
            actions.push(await this.processNote(reciteNote))
        }

        const nextIds = reciteNotes
            .filter((reciteNote): reciteNote is NoteWithID => hasID(reciteNote))
            .map((reciteNote) => reciteNote.id)
        note.config.reciteIds = nextIds

        const staleIds = _.difference(previousIds, nextIds)
        await this.deleteReciteIds(note, staleIds)

        return this.resolveBatchAction(actions, staleIds.length > 0)
    }

    private async processNote(note: NoteBase | NoteWithID): Promise<NoteAction> {
        const anki = this.plugin.anki

        // Skip
        if (note.config.enabled === false) {
            return NoteAction.Skipped
        }

        if (note.config.recite) {
            return this.processReciteNote(note)
        }

        // Delete
        if (note.config.delete) {
            if (hasID(note)) {
                anki.deleteNote(note)
            }

            note.config.delete = undefined
            note.config.enabled = false
            note.id = null

            return NoteAction.Deleted
        }

        const renderedFields = await this.renderFields(note)

        // Create if does not exist
        if (!hasID(note)) {
            // We must create note
            await this.easyAddNote(note, renderedFields)

            return NoteAction.Created
        }

        // Note has ID --->
        // Check if note exists on Anki
        const noteInfo = await anki.noteInfo(note)

        // No note with that ID found. Make it
        if (_.isEmpty(noteInfo)) {
            await this.easyAddNote(note, renderedFields)

            return NoteAction.Created
        }

        // Note exists on source and on Anki --->
        const notePairDelta = await this.notePairChanges(note, noteInfo, renderedFields)

        // Note pair did not change, but we did check
        if (!notePairDelta.shouldUpdate()) {
            return NoteAction.Checked
        }

        // Note pair changed
        // We must change model. This requires recreation sadly.
        if (notePairDelta.shouldChangeModel) {
            await anki.deleteNote(note)
            await this.easyAddNote(note, renderedFields)

            return NoteAction.Recreated
        }
        // We must update fields
        if (notePairDelta.shouldUpdateFields) {
            await this.easyUpdateNoteFields(note, renderedFields)
        }

        // We must update tags
        if (notePairDelta.shouldUpdateTags) {
            const tagsToSet = note.getTags(this.plugin)
            await anki.setTags(note, tagsToSet)
        }

        // We must update deck
        if (notePairDelta.cardsToUpdate.length) {
            const deckName = note.getDeckName(this.plugin)
            await anki.changeDeck(notePairDelta.cardsToUpdate, deckName)
        }

        return NoteAction.Updated
    }
    public async processFileResults(results: ProcessedFileResult): Promise<Array<NoteAction>> {
        let shouldUpdateSource = false

        const actions: Array<NoteAction> = []

        // Pass over all elements
        for (const element of results.elements) {
            // If element is a fragment, ignore
            if (!(element instanceof NoteBase)) {
                continue
            }

            const note = element

            let action: NoteAction
            try {
                action = await this.processNote(note)
            } catch (e) {
                if (!this.handleError(e, note)) {
                    action = NoteAction.NonFatalError
                } else {
                    throw e
                }
            }

            actions.push(action)
            shouldUpdateSource =
                shouldUpdateSource || note.shouldUpdateFile() || action === NoteAction.Deleted

            this.plugin.debug(`${NoteAction[action]}: ${note.id}`)
        }

        // Update file if content has changed
        if (shouldUpdateSource) {
            await this.app.vault.modify(results.sourceFile, results.elements.renderAsText())
        }

        return actions
    }
}
