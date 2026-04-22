import { describe, it, expect } from 'vitest'
import { parseDiff, fileMatches, buildFeedbackPlacement } from '../../../../src/lib/parseDiff'
import type { FeedbackPoint } from '../../../../src/lib/review'
import type { ParsedHunk } from '../../../../src/lib/diffTypes'

describe('parseDiff', () => {
  it('returns empty array for empty string', () => {
    expect(parseDiff('')).toEqual([])
  })

  it('parses a single file with additions and deletions', () => {
    const raw = `diff --git a/src/foo.ts b/src/foo.ts
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,3 @@
 context line
-removed line
+added line
 another context`

    const files = parseDiff(raw)
    expect(files).toHaveLength(1)
    expect(files[0].oldPath).toBe('src/foo.ts')
    expect(files[0].newPath).toBe('src/foo.ts')
    expect(files[0].additions).toBe(1)
    expect(files[0].deletions).toBe(1)
    expect(files[0].hunks).toHaveLength(1)
  })

  it('parses multiple files', () => {
    const raw = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,1 +1,1 @@
-old
+new
diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1,1 +1,1 @@
-old
+new`

    const files = parseDiff(raw)
    expect(files).toHaveLength(2)
    expect(files[0].newPath).toBe('a.ts')
    expect(files[1].newPath).toBe('b.ts')
  })

  it('handles new file (--- /dev/null)', () => {
    const raw = `diff --git a/new.ts b/new.ts
--- /dev/null
+++ b/new.ts
@@ -0,0 +1,2 @@
+line one
+line two`

    const files = parseDiff(raw)
    expect(files).toHaveLength(1)
    expect(files[0].oldPath).toBe('')
    expect(files[0].newPath).toBe('new.ts')
    expect(files[0].additions).toBe(2)
    expect(files[0].deletions).toBe(0)
  })

  it('handles deleted file (+++ /dev/null)', () => {
    const raw = `diff --git a/old.ts b/old.ts
--- a/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-line one
-line two`

    const files = parseDiff(raw)
    expect(files).toHaveLength(1)
    expect(files[0].oldPath).toBe('old.ts')
    expect(files[0].newPath).toBe('')
    expect(files[0].deletions).toBe(2)
  })

  it('tracks correct line numbers starting from hunk header', () => {
    const raw = `diff --git a/foo.ts b/foo.ts
--- a/foo.ts
+++ b/foo.ts
@@ -10,3 +10,3 @@
 context
-removed
+added`

    const lines = parseDiff(raw)[0].hunks[0].lines
    expect(lines[0]).toMatchObject({ type: 'context', oldLineNo: 10, newLineNo: 10 })
    expect(lines[1]).toMatchObject({ type: 'remove', oldLineNo: 11, newLineNo: null })
    expect(lines[2]).toMatchObject({ type: 'add', oldLineNo: null, newLineNo: 11 })
  })

  it('filters out files with no paths or no hunks', () => {
    const raw = `diff --git a/foo.ts b/foo.ts`
    expect(parseDiff(raw)).toEqual([])
  })
})

describe('fileMatches', () => {
  it('returns false for empty strings', () => {
    expect(fileMatches('', 'src/foo.ts')).toBe(false)
    expect(fileMatches('foo.ts', '')).toBe(false)
  })

  it('matches exact paths', () => {
    expect(fileMatches('src/foo.ts', 'src/foo.ts')).toBe(true)
  })

  it('matches when diff path has a longer prefix', () => {
    expect(fileMatches('foo.ts', 'src/foo.ts')).toBe(true)
    expect(fileMatches('utils/foo.ts', 'src/utils/foo.ts')).toBe(true)
  })

  it('does not match unrelated paths', () => {
    expect(fileMatches('bar.ts', 'src/foo.ts')).toBe(false)
    expect(fileMatches('foo.ts', 'src/barfoo.ts')).toBe(false)
  })
})

describe('buildFeedbackPlacement', () => {
  const makeFP = (lineStart: number, lineEnd: number): FeedbackPoint => ({
    id: 'fp_1',
    severity: 'medium',
    file: 'foo.ts',
    lineStart,
    lineEnd,
    title: 'test',
    description: 'test',
    suggestion: 'test',
    posted: false,
  })

  const hunks: ParsedHunk[] = [{
    header: '@@ -1,5 +1,5 @@',
    lines: [
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'add', content: 'b', oldLineNo: null, newLineNo: 2 },
      { type: 'add', content: 'c', oldLineNo: null, newLineNo: 3 },
      { type: 'context', content: 'd', oldLineNo: 3, newLineNo: 4 },
      { type: 'context', content: 'e', oldLineNo: 4, newLineNo: 5 },
    ],
  }]

  it('places feedback at the last new line within range', () => {
    const fp = makeFP(2, 3)
    const { feedbackByLine, unmatched } = buildFeedbackPlacement(hunks, [fp])
    expect(unmatched).toHaveLength(0)
    expect(feedbackByLine.get(3)).toContain(fp)
  })

  it('places feedback at nearest line when range is outside the hunk', () => {
    const fp = makeFP(10, 15)
    const { feedbackByLine, unmatched } = buildFeedbackPlacement(hunks, [fp])
    expect(unmatched).toHaveLength(0)
    expect(feedbackByLine.get(5)).toContain(fp)
  })

  it('puts feedback in unmatched when lineEnd <= 0', () => {
    const fp = makeFP(0, 0)
    const { feedbackByLine, unmatched } = buildFeedbackPlacement(hunks, [fp])
    expect(unmatched).toContain(fp)
    expect(feedbackByLine.size).toBe(0)
  })

  it('returns all feedback as unmatched when hunks are empty', () => {
    const { feedbackByLine, unmatched } = buildFeedbackPlacement([], [makeFP(1, 5)])
    expect(feedbackByLine.size).toBe(0)
    expect(unmatched).toHaveLength(1)
  })

  it('groups multiple feedback points at the same line', () => {
    const fp1 = makeFP(2, 3)
    const fp2 = makeFP(2, 3)
    const { feedbackByLine } = buildFeedbackPlacement(hunks, [fp1, fp2])
    expect(feedbackByLine.get(3)).toHaveLength(2)
  })
})
