import {
    formatSelectionForAnkiShortcutWrap,
    formatSelectionForAnkiShortcutUnwrap,
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
})
