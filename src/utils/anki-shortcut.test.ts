import {
    buildAnkiShortcutWrappedSelection,
    formatSelectionForAnkiShortcutWrap,
    formatSelectionForAnkiShortcutUnwrap,
    getAnkiShortcutPostFencePaddingLength,
} from 'ankibridge/utils/anki-shortcut'

describe('anki shortcut helpers', () => {
    it('adds a config separator between leading config properties and card body', () => {
        const input = ['deck: Test', 'tags:', '- one', '- two', 'Front body'].join('\n')

        expect(formatSelectionForAnkiShortcutWrap(input)).toBe(
            ['deck: Test', 'tags:', '- one', '- two', '---', 'Front body'].join('\n'),
        )
    })

    it('adds a leading separator when the selection starts with card body', () => {
        expect(formatSelectionForAnkiShortcutWrap('Front body')).toBe(['---', 'Front body'].join('\n'))
    })

    it('keeps an existing config separator unchanged while wrapping', () => {
        const input = ['deck: Test', '---', 'Front body'].join('\n')

        expect(formatSelectionForAnkiShortcutWrap(input)).toBe(input)
    })

    it('removes the config separator when unwrapping an anki block', () => {
        const input = ['deck: Test', 'tags:', '- one', '---', 'Front body'].join('\n')

        expect(formatSelectionForAnkiShortcutUnwrap(input)).toBe(
            ['deck: Test', 'tags:', '- one', 'Front body'].join('\n'),
        )
    })

    it('removes a leading separator when unwrapping content without config properties', () => {
        const input = ['---', 'Front body'].join('\n')

        expect(formatSelectionForAnkiShortcutUnwrap(input)).toBe('Front body')
    })

    it('builds a fenced anki block and appends an extra blank line after the closing fence', () => {
        expect(buildAnkiShortcutWrappedSelection('Front body')).toBe(
            ['```anki', '---', 'Front body', '```', '', ''].join('\n'),
        )
    })

    it('detects the extra blank line immediately after a closing fence', () => {
        expect(getAnkiShortcutPostFencePaddingLength('\n\nNext line')).toBe(2)
        expect(getAnkiShortcutPostFencePaddingLength('\nNext line')).toBe(0)
    })
})
