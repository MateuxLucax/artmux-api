import slugify from "slugify"

export function makeSlug(base: string): string {
  return slugify(base, {
    lower: true,
    remove: /[^a-zA-Z0-9\s]/g
  })
}

export function makeNumberedSlug(slug: string, slugnum: number): string {
  return slugnum == 1 ? slug : slug + '_' + slugnum
}

export function parseNumberedSlug(ns: string): { slug: string, slugnum: number } {
  const [slug, num] = ns.split('_')
  const slugnum = num ? Number(num) : 1
  return { slug, slugnum }
}
