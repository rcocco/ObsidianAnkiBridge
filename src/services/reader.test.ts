import { NoteBase } from 'ankibridge/notes/base'
import { Reader } from 'ankibridge/services/reader'
import { filepathToTFile } from 'ankibridge/test/helpers'

describe('Reader heading scopes', () => {
    const file = filepathToTFile('/tmp/reader-scope.md')

    const source = `# Root

\`\`\`anki-scope
deck: RootDeck
tags:
  - root
\`\`\`

\`\`\`anki
---
Root Front
\`\`\`

## Child

\`\`\`anki-scope
deck: ChildDeck
tags:
  - child
\`\`\`

\`\`\`anki
tags:
  - card
---
Front
===
Back
\`\`\`
`

    function makeReader() {
        const app = {
            vault: {
                read: jest.fn().mockResolvedValue(source),
            },
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({
                    frontmatter: {
                        anki_deck: 'FileDeck',
                        anki_tags: ['file'],
                    },
                }),
            },
        }

        const plugin = {
            registerMarkdownCodeBlockProcessor: jest.fn(),
            settings: {
                getBlueprintSettings: jest.fn().mockReturnValue({
                    BasicCodeblock: true,
                    Sandwich: false,
                }),
                defaultDeckMaps: [],
                fallbackDeck: 'FallbackDeck',
                tagInAnki: 'obsidian',
            },
            debug: jest.fn(),
        }

        return new Reader(app as any, plugin as any)
    }

    it('merges heading scope into descendant notes with child overrides', async () => {
        const reader = makeReader()
        await reader.setup()

        const result = await reader.readFile(file)
        const notes = result.elements.filter((element) => element instanceof NoteBase) as NoteBase[]

        expect(notes).toHaveLength(2)

        expect(notes[0].getDeckName(reader.plugin)).toBe('RootDeck')
        expect(notes[0].getTags(reader.plugin)).toEqual(['obsidian', 'file', 'root'])

        expect(notes[1].getDeckName(reader.plugin)).toBe('ChildDeck')
        expect(notes[1].getTags(reader.plugin)).toEqual([
            'obsidian',
            'file',
            'root',
            'child',
            'card',
        ])
    })

    it('adds heading text as tags when headingAsTag is enabled', async () => {
        const headingTagSource = `# Root Heading

\`\`\`anki-scope
headingAsTag: true
\`\`\`

## Child Heading

\`\`\`anki-scope
tags:
  - explicit
headingAsTag: true
\`\`\`

\`\`\`anki
---
Front
\`\`\`
`

        const app = {
            vault: {
                read: jest.fn().mockResolvedValue(headingTagSource),
            },
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({
                    frontmatter: {
                        anki_tags: ['file'],
                    },
                }),
            },
        }

        const plugin = {
            registerMarkdownCodeBlockProcessor: jest.fn(),
            settings: {
                getBlueprintSettings: jest.fn().mockReturnValue({
                    BasicCodeblock: true,
                    Sandwich: false,
                }),
                defaultDeckMaps: [],
                fallbackDeck: 'FallbackDeck',
                tagInAnki: 'obsidian',
            },
            debug: jest.fn(),
        }

        const reader = new Reader(app as any, plugin as any)
        await reader.setup()

        const result = await reader.readFile(file)
        const notes = result.elements.filter((element) => element instanceof NoteBase) as NoteBase[]

        expect(notes).toHaveLength(1)
        expect(notes[0].getTags(reader.plugin)).toEqual([
            'obsidian',
            'file',
            'Root Heading',
            'explicit',
            'Child Heading',
        ])
    })

    it('preserves heading order when multiple notes appear after earlier fragments', async () => {
        const complexSource = `# Test 1

\`\`\`anki
---
Card 1
\`\`\`

## Test 2

\`\`\`anki
---
Card 2
\`\`\`

### Test 2-1
\`\`\`anki
---
Card 2-1
\`\`\`

## Test 3
\`\`\`anki
---
Card 3
\`\`\`

### Test 3-1
\`\`\`anki
---
Card 3-1
\`\`\`
`

        const app = {
            vault: {
                read: jest.fn().mockResolvedValue(complexSource),
            },
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({ frontmatter: {} }),
            },
        }

        const plugin = {
            registerMarkdownCodeBlockProcessor: jest.fn(),
            settings: {
                getBlueprintSettings: jest.fn().mockReturnValue({
                    BasicCodeblock: true,
                    Sandwich: false,
                }),
                defaultDeckMaps: [],
                fallbackDeck: 'FallbackDeck',
                tagInAnki: 'obsidian',
            },
            debug: jest.fn(),
        }

        const reader = new Reader(app as any, plugin as any)
        await reader.setup()

        const result = await reader.readFile(file)
        const notes = result.elements.filter((element) => element instanceof NoteBase) as NoteBase[]

        notes.forEach((note, idx) => {
            note.id = idx + 1
        })

        expect(result.elements.renderAsText()).toContain('### Test 3-1\n```anki\nid: 5\n---\nCard 3-1\n```\n')
    })

    it('preserves heading order for scoped headings like the reported regression', async () => {
        const complexSource = `---
anki_deck: Deck
anki_tags: [tag]
---
# 测试1

\`\`\`anki-scope
tags: [测试1]
\`\`\`

\`\`\`anki
---
测试1**里面**的内容
\`\`\`
## 测试2

\`\`\`anki
---
测试2**里面**的内容
\`\`\`

### 测试2-1
\`\`\`anki
---
测试2-1 **里面**的内容
\`\`\`
## 测试3
\`\`\`anki-scope
tags: [测试3]
\`\`\`

\`\`\`anki
---
测试3**里面**的内容
\`\`\`
### 测试3-1
\`\`\`anki
---
测试3-1 **里面**的内容
\`\`\`
# 测试4
\`\`\`anki
---
测试4**里面**的内容
\`\`\`
## 测试4-1
\`\`\`anki-scope
deck: 改变的测试
tags: [测试45]
\`\`\`

\`\`\`anki
---
测试4-1 **里面**的内容
\`\`\`
`

        const app = {
            vault: {
                read: jest.fn().mockResolvedValue(complexSource),
            },
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({
                    frontmatter: { anki_deck: 'Deck', anki_tags: ['tag'] },
                }),
            },
        }

        const plugin = {
            registerMarkdownCodeBlockProcessor: jest.fn(),
            settings: {
                getBlueprintSettings: jest.fn().mockReturnValue({
                    BasicCodeblock: true,
                    Sandwich: false,
                }),
                defaultDeckMaps: [],
                fallbackDeck: 'FallbackDeck',
                tagInAnki: 'obsidian',
            },
            debug: jest.fn(),
        }

        const reader = new Reader(app as any, plugin as any)
        await reader.setup()

        const result = await reader.readFile(file)
        const notes = result.elements.filter((element) => element instanceof NoteBase) as NoteBase[]
        notes.forEach((note, idx) => {
            note.id = idx + 100
        })

        const rendered = result.elements.renderAsText()

        expect(rendered.indexOf('### 测试3-1')).toBeLessThan(rendered.indexOf('测试3-1 **里面**的内容'))
        expect(rendered.indexOf('# 测试4')).toBeLessThan(rendered.indexOf('测试4**里面**的内容'))
    })
})
