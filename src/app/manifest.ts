import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PIBB Kids",
    short_name: "PIBB Kids",
    description: "Ministério Infantil da Primeira Igreja Batista em Barueri",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    icons: [
      { src: "/icon.png", sizes: "98x102", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
