import { NoteField } from 'ankibridge/entities/note'
import { NoteBase } from 'ankibridge/notes/base'
import { ProcessorContext } from 'ankibridge/processors/base'
import { Postprocessor } from 'ankibridge/processors/postprocessors/base'

export class ClozePostprocessor extends Postprocessor {
    static id = 'ClozePostprocessor'
    static displayName = 'ClozePostprocessor'
    static weight = 70
    static defaultConfigState = true

    public async postprocess(
        note: NoteBase,
        domField: HTMLTemplateElement,
        ctx: ProcessorContext,
    ): Promise<void> {
        // Clozes are only specified on frontlike field
        if (ctx.noteField != NoteField.Frontlike || note.config.cloze === false) {
            return
        }

        let clozeIterator = 1
        let sawCloze = false
        let targets: Array<HTMLElement> = []

        if (this.plugin.settings.markToCloze) {
            targets = targets.concat(Array.from(domField.content.querySelectorAll('mark')))
        }
        if (this.plugin.settings.deleteToCloze) {
            targets = targets.concat(Array.from(domField.content.querySelectorAll('del')))
        }
        if (this.plugin.settings.boldToCloze) {
            targets = targets.concat(Array.from(domField.content.querySelectorAll('strong')))
        }

        const reservedClozeIndices = new Set(
            targets
                .map((target) => /(?:\[c(\d+)\])$/.exec(target.textContent || ''))
                .filter((match): match is RegExpExecArray => match !== null)
                .map((match) => Number(match[1])),
        )

        targets.forEach((target) => {
            const content = target.textContent
            const mat = /(?:\[c(\d+)\])$/.exec(content || "")
            if(mat) {
                const clozeIdx = mat[1]
                const pureContent = content?.slice(0, mat.index)
                const cloze = `{{c${clozeIdx}::${pureContent}}}`
                const clozeNode = document.createTextNode(cloze)
                target.replaceWith(clozeNode)
                sawCloze = true
            }else {
                while (reservedClozeIndices.has(clozeIterator)) {
                    clozeIterator++
                }
                const cloze = `{{c${clozeIterator}::${content}}}`
                const clozeNode = document.createTextNode(cloze)
                target.replaceWith(clozeNode)
                clozeIterator++
                sawCloze = true
            }
        })

        if (sawCloze) {
            note.isCloze = true
        }
    }
}
