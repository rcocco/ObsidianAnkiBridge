# Obsidian AnkiBridge

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/JeppeKlitgaard/ObsidianAnkiBridge?style=for-the-badge&sort=semver)](https://github.com/JeppeKlitgaard/ObsidianAnkiBridge/releases/latest)
![GitHub All Releases](https://img.shields.io/github/downloads/JeppeKlitgaard/ObsidianAnkiBridge/total?style=for-the-badge)

Anki integration for [Obsidian](https://obsidian.md/).

**Please refer to the [documentation](https://jeppeklitgaard.github.io/ObsidianAnkiBridge/).**

## Additions in This Fork

Compared with the original project, this fork adds several practical improvements:

- Support for `deckName` and `tags` in file-level frontmatter.
- Support for `deckName` and `tags` at the heading level, allowing different sections of the same note to use different metadata.
- Support for manually assigning cloze numbers through bold cloze syntax.
- Shortcut helpers for wrapping and unwrapping Anki markup while editing notes.

### Examples

#### 1. File-level `deckName` and `tags`

You can define deck and tag defaults for the whole note in frontmatter:

````md
---
deckName: Biology::Cells
tags:
  - biology
  - chapter-1
---

```anki
---
What is the powerhouse of the cell?
===
Mitochondria
```
````

#### 2. Heading-level `deckName` and `tags`

You can also scope deck and tags to a heading by using an `anki-scope` block:

````md
# Chapter 1

```anki-scope
deckName: Biology::Chapter1
tags:
  - chapter-1
```

```anki
---
Question for chapter 1
===
Answer
```

## Chapter 2

```anki-scope
deckName: Biology::Chapter2
tags:
  - chapter-2
```

```anki
---
Question for chapter 2
===
Answer
```
````

#### 3. Manual cloze numbering with bold text

When bold-to-cloze is enabled, you can manually assign the cloze index by appending `[cN]` inside the bold text:

```md
The capital of France is **Paris[c1]** and the capital of Japan is **Tokyo[c2]**.
```

This will produce clozes equivalent to:

```md
The capital of France is {{c1::Paris}} and the capital of Japan is {{c2::Tokyo}}.
```

#### 4. Shortcut wrap and unwrap helpers

The shortcut helper can wrap plain content into an Anki block separator format:

Before wrap:

```md
deck: Demo
tags:
  - sample
Front side
```

After wrap:

```md
deck: Demo
tags:
  - sample
---
Front side
```

And unwrap removes the separator again:

```md
deck: Demo
tags:
  - sample
Front side
```
