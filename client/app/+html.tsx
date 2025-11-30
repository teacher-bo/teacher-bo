import Constants from "expo-constants";
import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  const siteUrl = process.env.EXPO_PUBLIC_URL?.replace(/\/$/, "");

  const shortName = Constants.expoConfig?.web?.shortName;
  const title = Constants.expoConfig?.web?.name;
  const description = "보선생 TeacherBo - 환각없는 보드게임 음성 도우미";

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <meta name="theme-color" content="#242b38" />
        <meta name="description" content={description} />
        <meta name="application-name" content={shortName} />
        <meta name="apple-mobile-web-app-title" content={shortName} />

        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:title" content={title} />
        <meta property="og:site_name" content={shortName} />
        <meta property="og:description" content={description} />
        {siteUrl && <meta property="og:url" content={siteUrl} />}

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />

        {siteUrl && <link rel="canonical" href={siteUrl} />}

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />
        <style>
          {`body {
            background-color:#242b38;
          }`}
        </style>
      </head>
      <body>{children}</body>
    </html>
  );
}
