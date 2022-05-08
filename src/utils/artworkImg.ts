import path from 'path'

export const ARTWORK_IMG_DIRECTORY = path.resolve('./artworkimg')

// TODO accepted extensions
// TODO and also make an endpoint so the front-end can know the accepted extensions

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