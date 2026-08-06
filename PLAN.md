# BetterRack → Kotlin + Jetpack Compose Migration Plan

## 0. Scope (decided)

- **Full-stack Kotlin rewrite.** Both the backend (currently Bun + Hono + TypeScript) and the
  client are ported to Kotlin. The backend becomes a **Ktor** server; the client becomes a
  **native Jetpack Compose Android app**.
- **Android only.** No Compose Multiplatform for now. The existing Electron desktop app and its
  ultra-light-js web client are left untouched and keep running as-is; retiring them is a
  separate, later decision, out of scope here.
- **Deployment model stays the same shape it is today.** BetterRack is self-hosted: the server
  runs on a PC/NAS on the user's LAN (today packaged as an Electron app on Windows via
  `electron-builder`/nsis, or run directly with `bun run`), and clients connect to it over HTTP
  using a configured `baseUrl`. That's confirmed by `client/capacitor.config.ts`
  (`allowNavigation: ['192.168.1.117', '192.168.1.120']`) and the `baseUrl` field in
  `TAppSettings`. The new Ktor server replaces the Bun/Hono server as that same LAN service; the
  Compose app replaces the Capacitor-wrapped web client as the Android front end talking to it.
- The SQLite database is reused as-is — no data migration needed, only matching Kotlin table
  definitions (see §4).

## 1. Current architecture (for reference)

```
                         ┌─────────────────────────────┐
                         │   Bun + Hono server (:3000)  │
                         │   src/routers/*  (Hono)       │
                         │   src/controllers/*           │
                         │   src/models/*                │
                         │   SQLite (drizzle-orm)        │
                         └───────────────┬───────────────┘
                                         │ HTTP (JSON)
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
     ┌───────────▼───────────┐ ┌────────▼────────┐  ┌───────────▼───────────┐
     │ Browser (dev/prod)     │ │ Electron desktop │  │ Capacitor Android app │
     │ client/dist (served    │ │ (wraps same web   │  │ (wraps same web       │
     │ by the Hono server)    │ │ client, bundles    │  │ client, points at a    │
     └────────────────────────┘ │ server binary)     │  │ configured baseUrl)    │
                                 └────────────────────┘  └────────────────────────┘
```

Backend responsibilities (`src/`):
- **Routers → Controllers → Models** (classic layered MVC), dependency-injected by constructor
  in `src/run.ts`.
- Library scanning & folder tree (`libraryModel.ts`, `directoryModel.ts`).
- Archive handling: `decompressor.model.ts` shells out to bundled `7z`/`unrar` binaries to list
  and extract pages from `.cbz/.cbr/.cb7/.zip/.rar/.7z` files.
- Thumbnailing: `thumbnailModel.ts` uses `sharp` (native libvips binding) to extract/resize
  cover images.
- Wiki metadata: `wikiModel.ts` + `better-wiki` (Fandom wiki client) and
  `gcwHtmlParserModel.ts` + `linkedom` (DOM parsing for scraping GetComics.org).
- Downloads: `getComicsApiModel.ts` (scrapes GetComics for post/download links, with
  `cacheModel.ts` as a TTL cache) and `downloadModel.ts` (streams files to disk with retry/
  progress).
- Settings/preferences and per-item prefs persisted in SQLite via `drizzle-orm`
  (`src/database/schema.ts`): `app_settings`, `library_item_prefs`, `comic_data`.

Client responsibilities (`client/src/`), built with the custom `ultra-light-js` framework:
- Pages: `library-page`, `reader.page`, `search.page`, `settings.page`, `store.page`.
- Contexts (global reactive state): library, settings, sidebar, comic-cache, comics-types,
  read-types, user-pref-cache, document-title, and four modal contexts (confirm, folder-prefs,
  move-file, new-folder).
- Components: comic-card (+ cover/rating/actions/mark-as-read/move/delete/identify), folder-card
  (+ stack variants), sidebar (+ group/element/search), header/header-menu, breadcrumbs,
  page-header, dropdown, reader-page-image/-header/-progress-bar, comic-identifier (+ suggestion
  cards), store-card, state-filter, layout-selector, br-button, text-field, item-counter, loader,
  app-loader.

## 2. Target architecture

```
                    ┌──────────────────────────────────────────┐
                    │  Ktor server (JVM, runs on PC/NAS)        │
                    │  server/src/main/kotlin/...                │
                    │  Routing → Services → Repositories         │
                    │  SQLite via Exposed (same .db file)        │
                    └───────────────────┬────────────────────────┘
                                        │ HTTP (JSON, kotlinx.serialization)
                                        │
                    ┌───────────────────▼────────────────────────┐
                    │  Android app (Jetpack Compose)              │
                    │  android/app/src/main/java/...               │
                    │  Configurable server baseUrl in Settings     │
                    │  (same UX as today's "Base URL" field)       │
                    └────────────────────────────────────────────┘

     (Electron desktop app + its web client: untouched, kept running in parallel)
```

Shared, pure-Kotlin DTOs/enums (no framework deps) live in a `shared` module and are consumed by
both `server` and `android`, using `kotlinx.serialization` for wire format. This keeps request/
response shapes identical on both ends without hand-duplicating them, mirroring how `src/types.ts`
is the single source of truth today.

## 3. Technology mapping

| Concern                        | Today (TypeScript)                     | Kotlin target                                              |
|---------------------------------|-----------------------------------------|--------------------------------------------------------------|
| HTTP server framework           | Hono                                    | Ktor Server (Netty engine)                                  |
| Runtime                         | Bun                                      | JVM 21 (Temurin)                                             |
| DB access                       | drizzle-orm + SQLite                    | Exposed (or SQLDelight) + `org.xerial:sqlite-jdbc`, same schema |
| Archive extraction (zip/rar/7z) | shelled-out `7z`/`unrar` binaries        | Apache Commons Compress (zip, 7z, tar) + `junrar` (rar), pure JVM, no bundled binaries |
| Image resize/thumbnailing       | `sharp` (native libvips addon)          | `com.twelvemonkeys.imageio` (broad format read support, incl. webp) + `java.awt`/`Thumbnailator` for resize |
| HTML scraping (GetComics)       | `linkedom`                              | Jsoup                                                        |
| Wiki client (Fandom)            | `better-wiki` npm package               | Custom Ktor-client-based `WikiClient` calling the Fandom REST/MediaWiki API directly |
| HTTP client (outbound scraping/downloads) | `fetch`                       | Ktor Client (CIO engine)                                     |
| JSON (de)serialization          | implicit via Hono/`JSON`                | `kotlinx.serialization.json`                                 |
| CORS                             | `hono/cors`                             | Ktor `CORS` plugin                                            |
| Static file serving (web client) | `serveStatic`                          | Not needed — Android client is native, no bundled web assets on this server |
| Dependency injection            | manual constructor wiring in `run.ts`   | manual constructor wiring in `Application.kt` (Koin optional if it grows) |
| Frontend framework              | `ultra-light-js` (custom reactive DOM)  | Jetpack Compose                                               |
| Client-side routing              | `UltraRouter`                           | Navigation Compose                                            |
| Client-side global state         | `ultraState` + `UltraContext`           | ViewModel + `StateFlow`/`MutableState`, `CompositionLocal` for the rare cross-cutting case |
| Client HTTP calls                | `fetch` wrappers in `client/src/services/*` | Ktor Client (CIO/OkHttp engine) + Retrofit-style repositories |
| Image loading/caching (client)   | `<img>` + browser cache                 | Coil                                                          |
| Local persistence (client)       | browser storage / in-memory contexts    | Jetpack DataStore (settings, cached prefs) + Room (optional local cache of library listing/read progress for offline browsing) |
| Toasts                           | `notyf`                                 | `SnackbarHost` (Compose)                                      |
| Background downloads             | server-side, streamed to disk           | still server-side (Ktor); Android polls/observes progress and can show a notification via `WorkManager`-driven periodic check or SSE/WebSocket if added |
| Packaging (server)               | `electron-builder` nsis installer (bundles Bun server binary) | Gradle `application`/`shadowJar` → runnable fat jar, or `jpackage` for a native Windows installer/service — bundling replaces the old nsis step |
| Packaging (client)               | Capacitor Android build (`cap sync android`, gradlew) | Standard Android Gradle Plugin APK/AAB build — this *is* the native equivalent, no wrapper layer needed |

## 4. Database

Both today's server and the new one talk to a plain SQLite file — no migration is needed, only
Kotlin table definitions that match the existing schema exactly, so the new server can open a
user's existing `*.db` file unchanged:

```kotlin
// server/src/main/kotlin/.../db/Schema.kt (Exposed)
object AppSettings : Table("app_settings") {
    val key = text("key")
    val value = text("value").nullable()
    override val primaryKey = PrimaryKey(key)
}

object LibraryItemPrefs : Table("library_item_prefs") {
    val uid = text("uid")
    val prefPublisher = text("pref_publisher").nullable()
    val recursive = integer("recursive").nullable()
    val prefCover = text("pref_cover").nullable()
    override val primaryKey = PrimaryKey(uid)
}

object ComicData : Table("comic_data") {
    val uid = text("uid")
    val prefId = integer("pref_id").nullable()
    val sourceWiki = text("source_wiki").nullable()
    val cover = text("cover").nullable()
    val identified = integer("identified").nullable() // tri-state, same convention as today
    val comic = text("comic").nullable()               // JSON-serialized WikiComic
    val rating = integer("rating").nullable()
    val currentPage = integer("current_page").nullable()
    val readPer = double("read_per").nullable()
    val read = integer("read").nullable()
    override val primaryKey = PrimaryKey(uid)
}
```

Keep the tri-state integer conventions (`identified`: null/0/1) exactly as documented in
`src/database/schema.ts` and `src/types.ts` — client and server both depend on that encoding.

## 5. Shared domain models (`shared` module)

Port `src/types.ts` 1:1 into `@Serializable` Kotlin data classes/sealed interfaces. This module
has zero Ktor/Android/JVM-specific dependencies so it compiles for both `server` and `android`.

Key ports:
- `TLibraryEntry` → `LibraryEntry`, `TLibraryGroup` → `LibraryGroup`, `TLibraryPref` → `LibraryPref`
- `TAppSettings` → `AppSettings`
- `TComicData` → `ComicData`
- `WikiComic` (from `better-wiki`) → a hand-ported `WikiComic` data class (fields: title, cover,
  publisher, summary, pageId, sourceWiki, etc. — enumerate from `better-wiki`'s type defs during
  Phase 1)
- `TPostLink`, `TDownloadLink`, `TDownloadableObject`, `TProgressEvent` (→ sealed class:
  `Preparing`, `Retrying`, `Progress`, `Done`, `Error`) — used by the store/downloads flow
- `TStrat` (`all` | `single` | `multiple`) → Kotlin enum `Strat`
- `WIKI_URLS` → `enum class WikiSource(val url: String)`

## 6. Backend migration (`server/`)

Directory structure:

```
server/
  build.gradle.kts
  src/main/kotlin/com/betterrack/server/
    Application.kt                     # ktor entrypoint, wiring, replaces src/run.ts
    plugins/
      Routing.kt
      Serialization.kt
      Cors.kt
    routes/
      LibraryRoutes.kt                 # /api/library
      WikiRoutes.kt                    # /api/wiki
      ComicDataRoutes.kt               # /api/comic-data
      SettingsRoutes.kt                # /api/settings
      ComicsRoutes.kt                  # /api/comics
      DownloadsRoutes.kt               # /api/downloads
      ThumbnailRoutes.kt               # /api/thumbnail
      ComicReaderRoutes.kt             # /read
    services/
      LibraryService.kt                # replaces libraryModel.ts + directoryModel.ts
      ComicDataService.kt              # replaces comic-data/comicDataModel.ts
      SettingsService.kt               # replaces preferencesModel.ts
      ThumbnailService.kt              # replaces thumbnailModel.ts
      DownloadService.kt               # replaces downloadModel.ts
      GetComicsService.kt              # replaces getComicsApiModel.ts + gcwHtmlParserModel.ts
      CacheService.kt                  # replaces cacheModel.ts (in-memory TTL cache)
      WikiService.kt                   # replaces wikiModel.ts (Fandom client)
    archive/
      ArchiveReader.kt                 # replaces decompressor.model.ts (Commons Compress + junrar)
    db/
      Schema.kt
      Database.kt
    Config.kt                          # env/config loading (replaces .env handling in preferencesModel)
  src/test/kotlin/...
```

Route-for-route port (endpoint contracts stay identical so the existing web client could, in
principle, be pointed at the new server for regression testing during the transition):

| Router (today)          | Endpoints                                                                 | Ktor route file       |
|---------------------------|----------------------------------------------------------------------------|-------------------------|
| `libraryRouter`            | `GET /`, `GET /preferences/:uid`, `PUT /preferences/:uid`, `GET /refresh`, `POST /folder`, `POST /file/move`, `DELETE /folder`, `DELETE /file` | `LibraryRoutes.kt`     |
| `wikiRouter`               | `GET /comic`, `GET /comic/:id`, `GET /comics`                              | `WikiRoutes.kt`         |
| `comicDataRouter`          | `GET /`, `PATCH /:uid`                                                     | `ComicDataRoutes.kt`    |
| `settingsRouter`           | `GET /`, `PUT /`, `POST /library-folder`, `DELETE /library-folder`         | `SettingsRoutes.kt`     |
| `comicsRouter`             | `GET /`, `GET /:id/links`                                                  | `ComicsRoutes.kt`       |
| `downloadsRouter`          | `GET /`                                                                    | `DownloadsRoutes.kt`    |
| `thumbnailRouter`          | `GET /:uuid`                                                               | `ThumbnailRoutes.kt`    |
| `comic-reader.router`      | `GET /:uuid`, `GET /:uuid/pages/:page`                                     | `ComicReaderRoutes.kt`  |

Notes carried over from the current implementation, worth preserving deliberately:
- The temp-extraction sweep (`Zip7Decompressor.sweepStale`, `COMIC_TMP_TTL_MS` = 30 min, swept
  every 10 min) → a Ktor coroutine launched at startup with `delay()`-based loop, or a scheduled
  executor.
- `CacheModel`'s TTL cache for GetComics responses → a small in-memory `ConcurrentHashMap`-based
  cache with expiry, or Caffeine if eviction policy needs to grow.
- Retry/backoff behavior in `DownloadModel` (`TProgressEvent.retrying`) → port the same retry
  loop with `kotlinx.coroutines` delay-based backoff.

## 7. Backend subsystem details

**Archive extraction** (`decompressor.model.ts` → `ArchiveReader.kt`): today this shells out to
bundled `7z`/`unrar` binaries (`resolveBin`, `resolve7zPath`, `resolveUnrarPath`,
`UNRAR_BIN_NAMES`, `RAR_EXTENSIONS`, `IMAGE_EXTENSIONS`). Replace entirely with JVM-native
libraries so there's no external binary to resolve/ship:
- `.zip`/`.cbz` → `java.util.zip` or Commons Compress `ZipFile`
- `.7z`/`.cb7` → Commons Compress `SevenZFile`
- `.rar`/`.cbr` → `junrar` (supports RAR4; verify RAR5 support before committing — this is the
  one format where a native fallback might still be needed if `junrar` can't cover it)
- Keep the same `listPages`/`extractPage`/`touchAccess`/`sweepStale` contract shape so
  `ComicReaderRoutes` stays a thin wrapper.

**Thumbnailing** (`thumbnailModel.ts` → `ThumbnailService.kt`): extract first image page via
`ArchiveReader`, decode with TwelveMonkeys ImageIO plugins (covers webp/tiff/etc. that stock
`ImageIO` can't read), resize, cache to disk the same way `getThumbnail(uid, filePath)` does today
(cache-first, generate-on-miss).

**Wiki identification** (`wikiModel.ts` + `better-wiki` → `WikiService.kt`): re-implement the
Fandom MediaWiki API calls `better-wiki` wraps (search, page-by-id, cover extraction at a given
thumbnail size) directly against `https://{wiki}.fandom.com/api.php` using Ktor Client +
kotlinx.serialization, scoped to the same `WIKI_URLS` list (dc/marvel/imagecomics/darkhorse/
dynamiteentertainment).

**GetComics scraping** (`gcwHtmlParserModel.ts` + `linkedom` → `GetComicsService.kt` using Jsoup):
port `getPostLinks`, `getDownloadLinkFromPost`, `getWeeklyListPosts`, `getDownloadLinks`,
`getCoverFromPost`, `getLatest` — same method shapes as `TGetComicsApiModel`, same `baseUrl`
setting used for the scrape request's `Referer`/`Origin` headers (`getComicsApiModel.ts:22`).

## 8. Android app migration (`android/`)

Directory structure:

```
android/
  app/
    build.gradle.kts
    src/main/java/com/betterrack/android/
      MainActivity.kt
      BetterRackApplication.kt
      di/                              # Hilt modules (network, db, repositories)
      navigation/
        BetterRackNavHost.kt           # replaces UltraRouter setup in client/src/main.ts
        Destinations.kt
      data/
        remote/
          BetterRackApi.kt             # Ktor client interface, mirrors client/src/services/*
          dto/                         # wire DTOs if distinct from `shared` models
        repository/
          LibraryRepository.kt         # replaces library.service.ts
          ComicDataRepository.kt       # replaces comic-data.service.ts
          SettingsRepository.kt        # replaces settings.service.ts
          StoreRepository.kt           # replaces store.service.ts
          WikiRepository.kt            # replaces wiki.service.ts
        local/
          SettingsDataStore.kt         # replaces settings.context localStorage-style persistence
          PrefsCache.kt                # replaces user-pref-cache.context.ts
      ui/
        theme/
          Color.kt Type.kt Theme.kt    # port CSS custom properties from client/src/main.css,
                                        # @fontsource/geist-sans + geist-mono → bundled font resources
        components/
          ComicCard.kt                 # + Cover, Rating, Actions, MarkAsReadButton, MoveButton,
                                        #   DeleteButton, IdentifyButton, InfoRow, Title
          FolderCard.kt                # + FolderCardStack, FolderStackCard
          Sidebar.kt                   # + SidebarGroup, SidebarElement, SidebarSearch
          Header.kt, HeaderMenu.kt
          Breadcrumbs.kt
          PageHeader.kt
          Dropdown.kt
          ReaderPageImage.kt, ReaderPageHeader.kt, ReaderPageProgressBar.kt
          ComicIdentifier.kt           # + SuggestionCard, DefaultContent
          StoreCard.kt
          StateFilter.kt
          LayoutSelector.kt
          BRButton.kt, TextField.kt, ItemCounter.kt, Loader.kt, AppLoader.kt
          ConfirmDialog.kt, FolderPrefsDialog.kt, MoveFileDialog.kt, NewFolderDialog.kt
      viewmodel/
        LibraryViewModel.kt            # replaces library.context.ts
        ReaderViewModel.kt             # replaces comic-cache.context.ts + reader page-local state
        SettingsViewModel.kt           # replaces settings.context.ts
        SearchViewModel.kt
        StoreViewModel.kt
        SidebarViewModel.kt            # replaces sidebar.context.ts
      screens/
        library/LibraryScreen.kt       # replaces pages/library-page.ts
        reader/ReaderScreen.kt         # replaces pages/reader.page.ts
        search/SearchScreen.kt         # replaces pages/search.page.ts
        settings/SettingsScreen.kt     # replaces pages/settings.page.ts
        store/StoreScreen.kt           # replaces pages/store.page.ts
  gradle/, settings.gradle.kts
```

State/context mapping (`client/src/context/*` → ViewModel + `StateFlow`):

| ultra-light-js context           | Compose equivalent                                                        |
|------------------------------------|-------------------------------------------------------------------------------|
| `library.context.ts`               | `LibraryViewModel` exposing `StateFlow<List<LibraryGroup>>`                  |
| `settings.context.ts`              | `SettingsViewModel` + `SettingsDataStore` (Jetpack DataStore)                |
| `sidebar.context.ts`               | `SidebarViewModel` (open/closed state, search query)                         |
| `comic-cache.context.ts`           | Coil's own memory/disk cache + a small `ReaderViewModel` page-index cache     |
| `comics-types.context.ts`          | plain `StateFlow<ComicsTypeFilter>` in `LibraryViewModel`                    |
| `read-types.context.ts`            | plain `StateFlow<ReadTypeFilter>` in `LibraryViewModel`                      |
| `user-pref-cache.context.ts`       | `PrefsCache` backed by DataStore or an in-memory map keyed by uid            |
| `document-title.context.ts`        | not needed (no browser tab) — use Compose's top-app-bar title state directly |
| `confirm-modal.context.ts`         | a reusable `ConfirmDialog` composable driven by local/ViewModel state         |
| `folder-prefs-modal.context.ts`    | `FolderPrefsDialog` + `SettingsViewModel`/`LibraryViewModel` state           |
| `move-file-modal.context.ts`       | `MoveFileDialog` + `LibraryViewModel` state                                  |
| `new-folder-modal.context.ts`      | `NewFolderDialog` + `LibraryViewModel` state                                 |

Android-specific concerns with no direct web equivalent, to plan for explicitly:
- **Scoped storage / file access**: if any local file picking (e.g. choosing a download
  directory) is needed on-device, use the Storage Access Framework (`ACTION_OPEN_DOCUMENT_TREE`)
  — the old Node `fs`-based directory picker (`fsController.ts`/`fsModel`) has no Android
  equivalent since library folders live on the *server*, not the phone. Reader downloads are also
  server-side, so the app itself likely needs no broad storage permission at all.
- **Network security config**: since the app talks to a plain-`http://` LAN server (see
  `capacitor.config.ts`'s `androidScheme: 'http'`), add a `network_security_config.xml`
  `cleartextTrafficPermitted` exception scoped to the LAN, matching today's Capacitor setup.
- **Background/long-running work**: if download progress should survive navigating away, use a
  foreground `Service` or `WorkManager` observing the `/api/downloads` endpoint, replacing the
  in-page `TProgressEvent` stream handling.

## 9. Migration phases

1. **Scaffolding** — create `server/`, `android/`, `shared/` as Gradle modules (Kotlin DSL,
   version catalog). Get an empty Ktor server responding on `/api/library` with a stub, and an
   empty Compose app that calls it, before porting real logic.
2. **Shared models + DB** — port `src/types.ts` → `shared`, Exposed table defs → `server/db`,
   verify the new server can open an existing `library.db` file untouched.
3. **Core library backend** — `LibraryService` (scan, folder tree, preferences CRUD),
   `SettingsService`, `ComicDataService`, and their routes. No archive/thumbnail/wiki dependency
   yet — enough to list folders/files and store per-item state.
4. **Archive + thumbnail pipeline** — `ArchiveReader` (Commons Compress + junrar) and
   `ThumbnailService`, plus `ComicReaderRoutes`/`ThumbnailRoutes`. Validate against real `.cbz/
   .cbr/.cb7` files from the current library.
5. **Wiki + GetComics** — `WikiService`, `GetComicsService`, `CacheService`, plus their routes.
6. **Downloads** — `DownloadService` + `DownloadsRoutes`, with retry/progress semantics matching
   `TProgressEvent`.
7. **Backend parity checkpoint** — run the *existing* web client against the new Ktor server
   (point `baseUrl` at it) to catch contract drift before writing any Compose UI.
8. **Android skeleton** — nav graph, theme, DI, networking layer, empty screens for all five
   pages.
9. **Android library + reader** — the two highest-traffic screens: folder browsing, comic grid,
   comic card actions, reader with pager + progress.
10. **Android identifier + settings + store** — comic identification flow, settings screen
    (library folders, base URL, prefs), store/downloads screen with progress UI.
11. **Polish** — theming pass against the current design tokens, empty/loading/error states,
    offline handling, orientation/tablet layout pass.
12. **Cutover decision** — once Android app + Ktor server reach parity, decide whether/when to
    retire the Bun/Hono server and Capacitor Android build; Electron desktop stays out of scope
    regardless.

## 10. Testing strategy

- **Server**: Ktor's `testApplication` for route-level tests (mirrors what a Hono/`fetch` test
  suite would look like today, if one exists — check and port any existing backend tests).
  Unit tests for `ArchiveReader` against small fixture `.cbz/.cbr/.cb7` files, `ThumbnailService`
  against fixture images, `GetComicsService`/`WikiService` against recorded HTML/JSON fixtures
  (avoid live-scraping in CI).
- **Android**: Compose UI tests (`createComposeRule`) for key screens (library grid, reader
  pager, identify flow), ViewModel unit tests with fake repositories, and a small set of
  instrumented tests for navigation.
- **Contract tests**: since `shared` DTOs drive both ends, a round-trip serialization test per
  DTO catches breaking changes early.

## 11. Open questions to resolve before/during Phase 1

- Exact field list of `WikiComic` (from `better-wiki`) — needs to be read from that package's
  type defs (or its source, if vendored) to port faithfully into `shared`.
- Whether `junrar` covers all RAR variants currently encountered in real libraries (RAR5
  in particular) — if not, decide between shipping a bundled `unrar` binary as a fallback (same
  approach as today, just scoped to one format) or accepting the gap.
- Whether the server should keep serving a checked-in `.env` (as `preferencesModel.ts` does via
  `process.env.BASE_URL`) or move fully to the `app_settings` DB table plus a minimal
  `Config.kt` for first-run bootstrap values.
- Packaging target for the new server: fat jar + `jpackage` Windows installer (closest to today's
  nsis experience) vs. plain `java -jar` — affects how non-technical users install/update it.
