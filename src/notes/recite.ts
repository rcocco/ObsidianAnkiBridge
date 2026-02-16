import { Blueprint } from 'ankibridge/blueprints/base'
import { AnkiFields, Media, ModelName, NoteField, NoteFields, SourceDescriptor } from 'ankibridge/entities/note'
import { Config, NoteBase } from 'ankibridge/notes/base'
import { NotesInfoResponseEntity } from 'ankibridge/entities/network'

export class ReciteNote extends NoteBase {
    constructor(
        blueprint: Blueprint,
        id: number | null,
        {
            line,
            context,
            title,
            author,
            sequence,
            prompt,
        }: {
            line: string
            context: string
            title: string
            author: string
            sequence: string
            prompt: string
        },
        source: SourceDescriptor,
        sourceText: string,
        {
            config,
            medias = [],
        }: {
            config: Config
            medias?: Array<Media>
        },
    ) {
        super(
            blueprint,
            id,
            {
                [NoteField.Frontlike]: line,
                [NoteField.Backlike]: context,
                [NoteField.Title]: title,
                [NoteField.Author]: author,
                [NoteField.Sequence]: sequence,
                [NoteField.Prompt]: prompt,
            },
            source,
            sourceText,
            {
                config: config,
                medias: medias,
                isCloze: false,
            },
        )
    }

    public getModelName(): ModelName {
        return 'LPCG 1.0'
    }

    public fieldsToAnkiFields(fields: NoteFields): AnkiFields {
        return {
            Line: fields[NoteField.Frontlike] || '',
            Context: fields[NoteField.Backlike] || '',
            Title: fields[NoteField.Title] || '',
            Author: fields[NoteField.Author] || '',
            Sequence: fields[NoteField.Sequence] || '',
            Prompt: fields[NoteField.Prompt] || '',
        }
    }

    public normaliseNoteInfoFields(noteInfo: NotesInfoResponseEntity): NoteFields {
        return {
            [NoteField.Frontlike]: noteInfo.fields['Line']?.value || '',
            [NoteField.Backlike]: noteInfo.fields['Context']?.value || '',
            [NoteField.Title]: noteInfo.fields['Title']?.value || '',
            [NoteField.Author]: noteInfo.fields['Author']?.value || '',
            [NoteField.Sequence]: noteInfo.fields['Sequence']?.value || '',
            [NoteField.Prompt]: noteInfo.fields['Prompt']?.value || '',
        }
    }
}
