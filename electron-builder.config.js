import process from 'node:process';

const frontendDir = process.env.ELECTRON_FRONTEND === "client"
? "client" //ultra-light-js implementation
: "react"; //react          implementation

const currentYear = new Date().getFullYear();

export default {
  appId: "com.better.rack",
  // productName, version, description, author and homepage are read
  // from package.json ("Better Rack") so the installer, the .exe
  // version resource and the running app share one identity no
  // matter which frontend bundle is packaged. Only the bundled
  // frontend (extraResources) switches on ELECTRON_FRONTEND.
  copyright: `Copyright © ${currentYear} AminPerez`,
  directories: {
    output: "release",
    buildResources: "build",
  },
  files: ["dist/main.js", "dist/preload.cjs", "package.json"],
  extraResources: [
    { from: "dist/server", to: "server" },
    { from: `${frontendDir}/dist`, to: "client" },
  ],
  win: {
    target: "nsis",
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
