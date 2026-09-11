import exifr from 'exifr';
import sharp from 'sharp';

type Tags = Record<string, unknown>;

/** Friendly names keyed by camera model, ignoring punctuation and case. */
const CAMERA_NAMES: Record<string, string> = {
  ILCE6400: 'Sony α6400',
};

/** XMP text can be a string, a language alternative, or a list of alternatives. */
function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const preferred = value.find((v) => v?.lang === 'x-default');
    return text(preferred) || value.map(text).find(Boolean) || '';
  }
  if (value && typeof value === 'object') {
    const record = value as Tags;
    return text(record.value) || text(record['x-default']);
  }
  return '';
}

function firstText(...values: unknown[]): string {
  return values.map(text).find(Boolean) || '';
}

function positive(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(text(value));
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

/** Keep the camera's wall-clock fields, including when XMP supplies a UTC offset. */
function captureDate(...values: unknown[]): string {
  for (const value of values) {
    const match = text(value).match(/^(\d{4})[:-]?(\d{2})[:-]?(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    if (!match) continue;
    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(Date.UTC(+year, +month - 1, +day));
    if (date.getUTCFullYear() !== +year || date.getUTCMonth() !== +month - 1 || date.getUTCDate() !== +day) continue;
    if (hour && (+hour > 23 || +minute > 59 || +(second || 0) > 59)) continue;
    return `${year}-${month}-${day}${hour ? `T${hour}:${minute}:${second || '00'}` : ''}`;
  }
  return '';
}

export function metadataFromTags(tags: Tags, filename: string) {
  const fallback = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const caption = firstText(tags.title, tags.ObjectName, tags.Headline, tags.ImageDescription, tags.description, tags.CaptionAbstract)
    || fallback.replace(/^./u, (letter) => letter.toUpperCase());
  const city = firstText(tags.City);
  const country = firstText(tags.Country, tags.CountryName, tags.PrimaryLocationName);
  const place = [city, country].filter(Boolean).join(', ') || firstText(tags.Location, tags.SubLocation, tags.State, tags.ProvinceState);
  const make = text(tags.Make);
  const model = text(tags.Model);
  const modelKey = model.replace(/^sony\s*/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const camera = CAMERA_NAMES[modelKey]
    || (model.toLowerCase().startsWith(make.toLowerCase()) ? model : [make, model].filter(Boolean).join(' '));
  const shutter = positive(tags.ExposureTime);
  const aperture = positive(tags.FNumber);
  const iso = positive(tags.ISO) || positive(tags.ISOSpeedRatings);
  const focalLength = positive(tags.FocalLength);
  const exposure = [
    shutter && (shutter < 1 ? `1/${Math.round(1 / shutter)}s` : `${shutter}s`),
    aperture && `f/${aperture}`,
    iso && `ISO ${iso}`,
  ].filter(Boolean).join(' · ');
  const exif: Record<string, string> = {};
  if (camera) exif.Camera = camera;
  const lens = firstText(tags.LensModel, tags.Lens);
  if (lens) exif.Lens = lens;
  if (exposure) exif.Exposure = exposure;
  if (focalLength) exif['Focal length'] = `${Number(focalLength.toFixed(1))}mm`;
  return {
    caption,
    place,
    date: captureDate(tags.DateTimeOriginal, tags.CreateDate, tags.DateCreated),
    exif,
  };
}

export async function readPhotoMetadata(file: string) {
  let tags: Tags = {};
  try {
    if (/\.(webp|gif)$/i.test(file)) {
      // exifr does not read these containers; Sharp exposes their metadata blocks.
      const metadata = await sharp(file).metadata();
      if (metadata.xmp) {
        const xmp = await exifr.sidecar(metadata.xmp, { reviveValues: false }) as Record<string, Tags> | undefined;
        // sidecar() returns namespaces, unlike parse()'s flattened output.
        if (xmp) Object.assign(tags, xmp.dc, xmp.photoshop, xmp.xmp, xmp.aux, xmp.exifEX, xmp.tiff, xmp.exif);
      }
      if (metadata.exif) {
        // Sharp includes the JPEG EXIF prefix; exifr expects a TIFF header here.
        const tiff = metadata.exif.subarray(0, 6).toString() === 'Exif\0\0'
          ? metadata.exif.subarray(6) : metadata.exif;
        Object.assign(tags, await exifr.parse(tiff, { reviveValues: false }));
      }
    } else {
      tags = await exifr.parse(file, { xmp: true, iptc: true, reviveValues: false }) || {};
    }
  } catch (error) {
    console.warn(`[photos] Could not read metadata for ${file}; using available fields.`, error);
  }
  return metadataFromTags(tags, file.split(/[\\/]/).pop()!);
}
