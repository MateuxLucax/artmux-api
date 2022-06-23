import { exec } from 'child_process'
import path from 'path'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { makeNumberedSlug } from './slug'

export const ARTWORK_IMG_DIRECTORY = path.resolve('./public/images')
export const ARTWORK_IMG_TRASH_DIRECTORY = path.resolve('./public/images/trash')

// TODO accepted extensions
// TODO and also make an endpoint so the front-end can know the accepted extensions

// TODO since we have a trash, set up so it periodically unlinks the files in there for real

export enum ArtworkImgSize {
  Original = 'original',
  Medium = 'medium',
  Thumbnail = 'thumbnail'
}

export const MAX_SIDE_PX = {
  [ArtworkImgSize.Original]:  8192,
  [ArtworkImgSize.Medium]:    1024,
  [ArtworkImgSize.Thumbnail]:  256
}

export function
makeArtworkImgPath(userId: number, slug: string, size: ArtworkImgSize, ext: string): string {
  return `${ARTWORK_IMG_DIRECTORY}/${userId}_${slug}_${size}.${ext}`
}

export function
makeArtworkImgPaths(userId: number, slug: string, ext: string) {
  return {
    [ArtworkImgSize.Original]:  makeArtworkImgPath(userId, slug, ArtworkImgSize.Original,  ext),
    [ArtworkImgSize.Medium]:    makeArtworkImgPath(userId, slug, ArtworkImgSize.Medium,    ext),
    [ArtworkImgSize.Thumbnail]: makeArtworkImgPath(userId, slug, ArtworkImgSize.Thumbnail, ext)
  }
}

export function
artworkImgEndpoint(slug: string, slugnum: number, size: string)  {
  return `artworks/${makeNumberedSlug(slug, slugnum)}/images/${size}`;
}


const asyncExec = promisify(exec)

export async function
getArtworkImgPaths(userid: number, slug: string) {
  const { stdout } = await asyncExec(`ls ${ARTWORK_IMG_DIRECTORY}/${userid}_${slug}_original*`)
  const [, ext] = /.*\.(.*)/.exec(stdout) ?? []
  if (!ext) throw 'File not found';
  return makeArtworkImgPaths(userid, slug, ext);
}

export class ArtworkImageTransaction {

  private tempFilePath: string
  private createdPaths: string[]
  private renamedPaths: {from: string, to: string}[]
  private trashedPaths: string[]  // 'trashed' as in 'moved to the trash'

  constructor() {
    this.createdPaths = []
    this.renamedPaths = []
    this.trashedPaths = []
    this.tempFilePath = ''
  }

  setUploadedFile(path: string) {
    this.tempFilePath = path
    this.createdPaths.push(this.tempFilePath)
  }

  async create(paths: {original: string, medium: string, thumbnail: string}) {
    if (this.tempFilePath == '') {
      throw 'setUploadedFile() has not been called yet on this ArtworkImageTransaction instance. '
          + 'Therefore, it doesn\'t have a file path from which to create the resized versions.'
    }
    await fs.rename(this.tempFilePath, paths.original).then(() => this.createdPaths.push(paths.original))

    const cmd = (src:string, side:number, dst:string) =>
      `magick '${src}' -resize '${side}x${side}>' '${dst}'`

    const resizeOrig = cmd(paths.original, MAX_SIDE_PX.original, paths.original)
    const makeMedium = cmd(paths.original, MAX_SIDE_PX.medium, paths.medium)
    const makeThumbnail = cmd(paths.original, MAX_SIDE_PX.thumbnail, paths.thumbnail)

    await asyncExec(resizeOrig)
    await Promise.all([
      asyncExec(makeMedium).then(() => this.createdPaths.push(paths.medium)),
      asyncExec(makeThumbnail).then(() => this.createdPaths.push(paths.thumbnail)),
    ])
  }

  async delete(paths: string[]) {
    await Promise.all(paths.map(path =>
      asyncExec(`mv '${path}' '${ARTWORK_IMG_TRASH_DIRECTORY}'`)
      .then(() => this.trashedPaths.push(path))
    ));
  }

  async rename(
    oldpaths: {original: string, medium: string, thumbnail: string},
    newpaths: {original: string, medium: string, thumbnail: string}
  ) {
    await Promise.all([
      asyncExec(`mv '${oldpaths.original}' '${newpaths.original}'`)
        .then(() => this.renamedPaths.push({from: oldpaths.original, to: newpaths.original})),
      asyncExec(`mv '${oldpaths.medium}' '${newpaths.medium}'`)
        .then(() => this.renamedPaths.push({from: oldpaths.medium, to: newpaths.medium})),
      asyncExec(`mv '${oldpaths.thumbnail}' '${newpaths.thumbnail}'`)
        .then(() => this.renamedPaths.push({from: oldpaths.thumbnail, to: newpaths.thumbnail})),
    ])
  }

  async rollback() {
    console.log('imgtrx rollback!')
    if (this.createdPaths.length > 0) console.log(`unlinking  ${this.createdPaths.join(', ')}`)
    if (this.trashedPaths.length > 0) console.log(`restoring  ${this.trashedPaths.join(', ')}`)
    if (this.renamedPaths.length > 0) {
      console.log(`unrenaming ${this.renamedPaths.map(x => `${x.from} -> ${x.to}`).join(', ')}`)
    }
    // The order is important here.
    // Suppose we do an update where we change the image but not the title.
    // Then we need to move the current files to the trash and create new files
    // with the same names. Therefore, to undo this, we can't unlink after restoring
    // from the trash -- we would remove the images we just restored.
    await Promise.allSettled(this.createdPaths.map(fs.unlink))
    await Promise.allSettled(
      this.trashedPaths.map(file => asyncExec(`mv '${file}' '${ARTWORK_IMG_DIRECTORY}'`))
    )
    await Promise.allSettled(
      this.renamedPaths.map(x => asyncExec(`mv '${x.to}' '${x.from}'`))
    )
  }

}