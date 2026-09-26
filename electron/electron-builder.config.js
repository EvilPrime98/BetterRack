import process from 'node:process';
import { sharpLinuxResources, sharpResources, sharpWin32Resources } from './vendors/sharp.js';

const frontendDir = process.env.ELECTRON_FRONTEND === "client"
? "client" //ultra-light-js implementation
: "react"; //react          implementation

const currentYear = new Date().getFullYear();

export default {
  appId: "com.better.rack",
  copyright: `Copyright © ${currentYear} AminPerez`,
  directories: {
    output: "release",
    buildResources: "build",
  },
  files: ["dist/main.js", "dist/preload.cjs", "package.json"],
  extraResources: [
    { from: "dist/server", to: "server" },
    { from: `${frontendDir}/dist`, to: "client" },
    ...sharpResources,
  ],
  win: {
    target: "nsis",
    extraResources: [
      { from: "vendor/7zip/win32", to: "bin" },
      ...sharpWin32Resources,
    ],
    icon: "build/icon.ico",
    signtoolOptions: {
      publisherName: "AminPerez",
    },
    legalTrademarks: "Better Rack",
    artifactName: "${productName}-Setup-${version}.${ext}",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: "build/icon.ico",
    uninstallerIcon: "build/icon.ico",
    installerHeaderIcon: "build/icon.ico",
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Better Rack",
    uninstallDisplayName: "${productName} ${version}",
  },
  mac: {
    icon: "build/icon.png",
    category: "public.app-category.entertainment",
  },
  linux: {
    target: "AppImage",
    extraResources: [
      { from: "vendor/7zip/linux-x64", to: "bin" },
      ...sharpLinuxResources,
    ],
    artifactName: "${productName}-${version}.${ext}",
    icon: "build/icon.png",
    category: "Graphics;Viewer",
    synopsis: "Local comic book library reader",
    desktop: {
      entry: {
        Name: "Better Rack",
      },
    },
  },
};
