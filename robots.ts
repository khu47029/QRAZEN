import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qrcontent.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/legal/aup", "/legal/privacy", "/r/*"],
        disallow: ["/dashboard", "/dashboard/*", "/api/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
