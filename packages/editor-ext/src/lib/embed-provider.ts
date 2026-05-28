export interface IEmbedProvider {
  id: string;
  name: string;
  regex: RegExp;
  getEmbedUrl: (match: RegExpMatchArray, url?: string) => string;
}

export const embedProviders: IEmbedProvider[] = [
  {
    id: "loom",
    name: "Loom",
    regex: /^https?:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/([\da-zA-Z]+)\/?/,
    getEmbedUrl: (match, url) => {
      if (url.includes("/embed/")) {
        return url;
      }
      return `https://loom.com/embed/${match[1]}`;
    },
  },
  {
    id: "airtable",
    name: "Airtable",
    regex: /^https:\/\/(www.)?airtable.com\/([a-zA-Z0-9]{2,})\/.*/,
    getEmbedUrl: (match, url: string) => {
      const path = url.split("airtable.com/");
      if (url.includes("/embed/")) {
        return url;
      }
      return `https://airtable.com/embed/${path[1]}`;
    },
  },
  {
    id: "figma",
    name: "Figma",
    regex:
      /^https:\/\/[\w\.-]+\.?figma.com\/(file|proto|board|design|slides|deck)\/([0-9a-zA-Z]{22,128})/,
    getEmbedUrl: (match, url: string) => {
      // Hide UI chrome for cleaner embedding, allow scaling to fit
      return `https://www.figma.com/embed?url=${encodeURIComponent(url)}&embed_host=docmost&hide-ui=1`;
    },
  },
  {
    id: "typeform",
    name: "Typeform",
    regex: /^(https?:)?(\/\/)?[\w\.]+\.typeform\.com\/to\/.+/,
    getEmbedUrl: (match, url: string) => {
      return url;
    },
  },
  {
    id: "miro",
    name: "Miro",
    regex: /^https:\/\/(www\.)?miro\.com\/app\/board\/([\w-]+=)/,
    getEmbedUrl: (match, url) => {
      if (url.includes("/live-embed/")) {
        return url;
      }
      return `https://miro.com/app/live-embed/${match[2]}?embedMode=view_only_without_ui&autoplay=true&embedSource=docmost`;
    },
  },
  {
    id: "youtube",
    name: "YouTube",
    regex:
      /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
    getEmbedUrl: (match, url) => {
      if (url.includes("/embed/")) {
        return url;
      }
      return `https://www.youtube-nocookie.com/embed/${match[5]}`;
    },
  },
  {
    id: "vimeo",
    name: "Vimeo",
    regex:
      /^(https:)?\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/,
    getEmbedUrl: (match) => {
      return `https://player.vimeo.com/video/${match[4]}`;
    },
  },
  {
    id: "framer",
    name: "Framer",
    regex: /^https:\/\/(www\.)?framer\.com\/embed\/([\w-]+)/,
    getEmbedUrl: (match, url: string) => {
      return url;
    },
  },
  {
    id: "gdrive",
    name: "Google Drive",
    regex:
      /^((?:https?:)?\/\/)?((?:www|m)\.)?(drive\.google\.com)\/(?:file\/d\/|open\?id=|drive\/(?:u\/\d+\/)?folders\/)([a-zA-Z0-9_-]+)(?:\/.*|&.*)?$/,
    getEmbedUrl: (match, url: string) => {
      if (url.includes("/folders/")) {
        return `https://drive.google.com/embeddedfolderview?id=${match[4]}#list`;
      }
      return `https://drive.google.com/file/d/${match[4]}/preview`;
    },
  },
  {
    id: "gsheets",
    name: "Google Sheets",
    regex:
      /^((?:https?:)?\/\/)?((?:www|m)\.)?(docs\.google\.com)\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9_-]+)(?:\/.*)?$/,
    getEmbedUrl: (match, url: string) => {
      // Use htmlembed for a clean, read-only view without editing UI clutter
      return `https://docs.google.com/spreadsheets/d/${match[4]}/htmlembed?widget=true&headers=false&chrome=false`;
    },
  },
  {
    id: "gdoc",
    name: "Google Docs",
    regex:
      /^((?:https?:)?\/\/)?((?:www|m)\.)?(docs\.google\.com)\/document\/d\/(?:e\/)?([a-zA-Z0-9_-]+)(?:\/.*)?$/,
    getEmbedUrl: (match, url: string) => {
      // Use preview mode with embedded=true for a cleaner, scrollable view
      return `https://docs.google.com/document/d/${match[4]}/preview?usp=sharing&embedded=true`;
    },
  },
  {
    id: "gslides",
    name: "Google Slides",
    regex:
      /^((?:https?:)?\/\/)?((?:www|m)\.)?(docs\.google\.com)\/presentation\/d\/(?:e\/)?([a-zA-Z0-9_-]+)(?:\/.*)?$/,
    getEmbedUrl: (match, url: string) => {
      // Use embed mode with start=false for a cleaner presentation view
      return `https://docs.google.com/presentation/d/${match[4]}/embed?start=false&loop=false&delayms=3000`;
    },
  },

  {
    id: "iframe",
    name: "Iframe",
    regex: /any-iframe/,
    getEmbedUrl: (match, url) => {
      return url;
    },
  },
];

export function getEmbedProviderById(id: string) {
  return embedProviders.find(
    (provider) =>
      provider.id.toLowerCase() === id.toLowerCase() ||
      provider.name.toLowerCase() === id.toLowerCase(),
  );
}

export interface IEmbedResult {
  embedUrl: string;
  provider: string;
}

export function getEmbedUrlAndProvider(url: string): IEmbedResult {
  for (const provider of embedProviders) {
    const match = url.match(provider.regex);
    if (match) {
      return {
        embedUrl: provider.getEmbedUrl(match, url),
        provider: provider.id,
      };
    }
  }
  return {
    embedUrl: url,
    provider: "iframe",
  };
}
