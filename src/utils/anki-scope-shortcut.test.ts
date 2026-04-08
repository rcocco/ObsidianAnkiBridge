import { buildAnkiScopeShortcutBlock } from 'ankibridge/utils/anki-scope-shortcut'

describe('anki scope shortcut helper', () => {
    it('builds an anki-scope tags block and places the cursor on the next line', () => {
        expect(buildAnkiScopeShortcutBlock()).toEqual({
            text: ['```anki-scope', 'tags:', '```', '', ''].join('\n'),
            cursorOffset: '```anki-scope\ntags:\n'.length,
        })
    })
})
