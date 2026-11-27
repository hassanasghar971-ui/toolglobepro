import type { ToolDefinition } from "@/lib/types";

export const imageMetadataRemover: ToolDefinition = {
  slug: "image-metadata-remover",
  name: "Image Metadata Remover",
  h1: "Image Metadata Remover: View and Delete EXIF and GPS Data",
  tagline: "See what your photos reveal, then strip the hidden data without uploading a single file.",
  metaTitle: "Remove EXIF Data from Photos: Free, No Upload",
  metaDescription:
    "See and remove EXIF, GPS and hidden metadata from JPG, PNG and WebP photos for free. No upload, no quality loss, and files up to 600 MB. Runs in your browser.",
  category: "privacy-tools",
  icon: "eye",
  keywords: [
    "remove exif data",
    "exif remover",
    "image metadata remover",
    "remove gps from photo",
    "remove location from photo",
    "view exif data online",
    "photo metadata viewer",
    "strip metadata from image",
    "delete exif data without uploading",
    "remove metadata from jpg png webp",
  ],
  intro:
    "Every photo you take can carry a hidden label: the camera or phone model, the exact time, the software used and, very often, the GPS coordinates of where you were standing. This free image metadata remover shows you what is inside your JPG, PNG or WebP files, then strips it out right in your browser. Nothing is uploaded, so the photo and its secrets never leave your device.",
  howTo: [
    "Drag your photos onto the drop area, or tap it to choose files. You can add many at once.",
    "Wait a moment while each file is scanned. The details found, such as camera model, date and GPS location, appear under each photo, with sensitive items highlighted in red.",
    "Leave the rotation option on if your photos come from a phone, so they do not turn sideways after cleaning.",
    "Press the remove button. Each cleaned photo is scanned a second time to confirm that nothing is left.",
    "Download each cleaned file. Keep your originals somewhere safe, because removed metadata cannot be restored.",
  ],
  sections: [
    {
      heading: "What hidden data does a photo carry?",
      paragraphs: [
        "Most digital photos contain EXIF data, a block of tags written by the camera at the moment you press the shutter. Typical entries include the device make and model, the date and time, the lens and the software version. Phones usually add GPS coordinates when location access is switched on, sometimes with altitude as well. Some cameras also store a body serial number or the owner's name, which can tie a picture to one specific device or person.",
        "Beyond EXIF, image files can hold XMP packets written by editing apps, IPTC captions and keywords, embedded comments and thumbnails of the original picture. PNG files have their own text chunks and timestamps. This tool lists what it finds before you change anything, so you can see exactly what you would have shared.",
      ],
    },
    {
      heading: "When should you strip metadata?",
      paragraphs: [
        "Clean a photo before posting a picture of your home, your child's school, a car you are selling or anything else that could reveal where you live or spend your time. Marketplace listings, forum posts, blogs, support tickets and email attachments often keep the original file exactly as it was, while some social apps strip part of the data on upload and others do not. If you are unsure what a platform does, cleaning the file yourself is the safe choice.",
        "Photographers and journalists often clean files before sending them to clients or sources. Businesses do the same with product photos, so internal editing software names and staff names do not leak into public pages.",
      ],
    },
    {
      heading: "How the cleaning works without hurting quality",
      paragraphs: [
        "Many tools redraw the picture, which recompresses it and costs quality. This one does not. It reads the structure of the file, copies the image data untouched and leaves out the metadata blocks. For JPG files that means dropping EXIF, XMP, IPTC, comments and extra application segments while keeping the colour profile. For PNG it removes text, EXIF and timestamp chunks. For WebP it removes the EXIF and XMP chunks.",
        "Data tucked after the end of the image, which some cameras and apps use for extra payloads, is removed too. Because the pixels are never decoded, the cleaned photo looks identical to the original and even very large files finish quickly. After cleaning, the tool scans the new file again and tells you if any metadata remains.",
      ],
    },
    {
      heading: "Rotation, colour and what metadata removal cannot fix",
      paragraphs: [
        "Phones often save a photo sideways and rely on an orientation tag to display it upright. If that tag is deleted, some photos appear rotated. That is why the option to keep the rotation tag is on by default. It writes back a tiny block holding only the rotation number and nothing else. The colour profile stays as well, so colours look the same. WebP files do not keep rotation.",
        "Remember that metadata is only part of what a photo reveals. Faces, street signs, house numbers, reflections and shadows inside the picture are not touched. The file name is unchanged apart from an added clean suffix, so rename the file if it contains names or places.",
      ],
    },
    {
      heading: "Supported files and limits",
      paragraphs: [
        "The tool handles JPG, PNG and WebP files up to 600 MB each. HEIC, TIFF, RAW and GIF files are not supported yet, so convert them to JPG or PNG first. Files are read in slices rather than loaded whole, which keeps memory use low on phones, although a very large photo can still take a few seconds. Always keep your original: a cleaned copy cannot get its metadata back.",
      ],
    },
  ],
  faqs: [
    {
      q: "Is my photo uploaded to a server?",
      a: "No. The file is read, scanned and rewritten entirely inside your browser. Nothing is sent to ToolGlobe Pro or anyone else, and there is no account or sign-up.",
    },
    {
      q: "Will removing EXIF data reduce my image quality?",
      a: "No. The tool copies the picture data byte for byte and only leaves out the metadata blocks, so the pixels and the colour profile stay exactly as they were. The file usually gets slightly smaller.",
    },
    {
      q: "How can I check whether my photo contains a GPS location?",
      a: "Add the photo and read the details under it. If the camera saved coordinates, they are shown in red as a GPS location. They are displayed only on your own screen and are never sent anywhere.",
    },
    {
      q: "Why did my cleaned photo turn sideways?",
      a: "Phones often store photos rotated and use an orientation tag to display them upright. Turn on the option to keep the rotation tag and clean the original again. WebP files cannot keep this tag.",
    },
    {
      q: "Which file types are supported?",
      a: "JPG, PNG and WebP, up to 600 MB each. HEIC, TIFF, RAW and GIF files are not supported yet, so convert them to JPG or PNG first and clean the result.",
    },
    {
      q: "Does this remove everything that could identify me?",
      a: "It removes the metadata stored inside the file, such as EXIF, XMP, IPTC, comments and hidden trailing data. It cannot hide what is visible in the picture, such as faces or street signs, and it does not rename the file or control what a website adds after you upload it.",
    },
  ],
  features: [
    "Shows camera, date, software and GPS details found in each photo",
    "Removes EXIF, XMP, IPTC, comments and PNG text chunks",
    "Removes hidden data placed after the end of the image",
    "Copies image data untouched, so quality never changes",
    "Optional rotation tag so phone photos stay upright",
    "Scans the cleaned file again to confirm nothing is left",
    "Handles JPG, PNG and WebP files up to 600 MB",
    "Batch cleaning with progress and cancel",
    "Runs in a background worker, no upload and no sign-up",
  ],
  schemaType: "WebApplication",
  maxFileMB: 600,
  related: ["image-compressor"],
  datePublished: "2026-11-27",
  dateModified: "2026-11-27",
};

export default imageMetadataRemover;
