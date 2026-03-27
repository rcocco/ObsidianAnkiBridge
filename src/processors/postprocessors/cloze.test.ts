import { NoteField } from 'ankibridge/entities/note'
import { BasicNote } from 'ankibridge/notes/basic'
import { ClozePostprocessor } from 'ankibridge/processors/postprocessors/cloze'

describe('ClozePostprocessor', () => {
    function makeNote() {
        return new BasicNote(
            {} as any,
            null,
            '',
            '',
            {
                file: {} as any,
                from: 0,
                to: 0,
            },
            '',
            { config: {} },
        )
    }

    function makeTarget(content: string) {
        const target = {
            textContent: content,
            replaceWith: jest.fn(),
        }

        return target as unknown as HTMLElement
    }

    function getReplacementText(target: HTMLElement) {
        const [node] = (target.replaceWith as jest.Mock).mock.calls[0]
        return node.textContent
    }

    beforeEach(() => {
        ;(global as any).document = {
            createTextNode: (text: string) => ({ textContent: text }),
        }
    })

    it('skips manually assigned cloze indices when auto-numbering later bold text', async () => {
        const manual = makeTarget('apple[c1]')
        const automatic = makeTarget('banana')
        const domField = {
            content: {
                querySelectorAll: jest.fn().mockImplementation((selector: string) => {
                    if (selector === 'strong') {
                        return [manual, automatic]
                    }
                    return []
                }),
            },
        } as unknown as HTMLTemplateElement

        const postprocessor = new ClozePostprocessor(
            {} as any,
            {
                settings: {
                    markToCloze: false,
                    deleteToCloze: false,
                    boldToCloze: true,
                },
            } as any,
        )

        await postprocessor.postprocess(makeNote(), domField, {
            noteField: NoteField.Frontlike,
        })

        expect(getReplacementText(manual)).toBe('{{c1::apple}}')
        expect(getReplacementText(automatic)).toBe('{{c2::banana}}')
    })

    it('skips manually assigned cloze indices even when the manual bold appears later', async () => {
        const automatic = makeTarget('banana')
        const manual = makeTarget('apple[c1]')
        const domField = {
            content: {
                querySelectorAll: jest.fn().mockImplementation((selector: string) => {
                    if (selector === 'strong') {
                        return [automatic, manual]
                    }
                    return []
                }),
            },
        } as unknown as HTMLTemplateElement

        const postprocessor = new ClozePostprocessor(
            {} as any,
            {
                settings: {
                    markToCloze: false,
                    deleteToCloze: false,
                    boldToCloze: true,
                },
            } as any,
        )

        await postprocessor.postprocess(makeNote(), domField, {
            noteField: NoteField.Frontlike,
        })

        expect(getReplacementText(automatic)).toBe('{{c2::banana}}')
        expect(getReplacementText(manual)).toBe('{{c1::apple}}')
    })
})
