import { getProgress } from './progress.js'

export function generateInsights(book) {
  const pct       = getProgress(book)
  const completed = book.chapters.filter(c => c.completed)
  const openMyst  = (book.mysteries || []).filter(m => !m.resolved)
  const important = completed.filter(c => c.important)
  const notes     = book.notes || []
  const main      = book.characters?.main || []
  const insights  = []

  if (pct === 0) {
    insights.push("Every story begins here. What follows is still open.")
  } else if (pct < 15) {
    insights.push("You're still in the opening movements — the story is laying its foundations.")
  } else if (pct < 32) {
    insights.push("The world is expanding. Characters are beginning to reveal themselves.")
  } else if (pct < 48) {
    insights.push("The first complications have arrived. The story is testing what it's made of.")
  } else if (pct < 58) {
    insights.push("You're approaching the emotional midpoint — where the novel finds its true question.")
  } else if (pct < 72) {
    insights.push("The story has crossed its axis. What follows carries the weight of what came before.")
  } else if (pct < 87) {
    insights.push("The threads are beginning to draw together. The author is keeping their promises.")
  } else if (pct < 99) {
    insights.push("You're in the final movements. The story is deciding what it wants to mean.")
  } else {
    insights.push("You've reached the last page. What remains now is the story's echo in you.")
  }

  if (openMyst.length > 4)
    insights.push(`${openMyst.length} threads are still unresolved. This story withholds deliberately.`)
  else if (openMyst.length > 1 && pct > 55)
    insights.push("Several questions opened early are beginning to converge toward resolution.")
  else if (openMyst.length === 1 && pct > 60)
    insights.push("One thread still hangs. The novel may be saving its answer for the end.")
  else if (openMyst.length === 0 && book.mysteries?.length > 0)
    insights.push("All the threads have been tied. The story has answered itself.")

  if (main.length >= 3) {
    const dead = main.filter(c => !c.alive).length
    if (dead > 0)
      insights.push(`${dead} of the characters you've encountered ${dead === 1 ? 'is' : 'are'} no longer living.`)
    if (main.some(c => c.allegiance?.includes('→')))
      insights.push("At least one character's allegiance has shifted since the opening pages.")
  }

  if (important.length >= 3)
    insights.push("You've marked several chapters as pivotal. The pattern reveals where the story's weight lies.")
  if (notes.some(n => n.tag === 'theory'))
    insights.push("Your theories are accumulating. Readers often sense what's coming before it arrives.")
  if (notes.some(n => n.tag === 'theme') && !notes.some(n => n.tag === 'theory'))
    insights.push("You've been attending to the thematic layer. That attentiveness will pay off.")
  if (notes.length >= 4)
    insights.push("Your notes are beginning to form their own companion to the story.")

  return insights.slice(0, 6)
}
