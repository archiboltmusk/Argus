import SwiftUI
import AVKit

struct CinemetaCatalogResponse: Codable {
    let metas: [ArgusMediaItem]
}

struct CinemetaMetaResponse: Codable {
    let meta: ArgusMediaDetail
}

struct ArgusMediaItem: Identifiable, Codable, Hashable {
    let id: String
    let name: String?
    let title: String?
    let type: String?
    let poster: String?
    let background: String?
    let description: String?
    let releaseInfo: String?
    let imdbRating: String?
    let streamUrl: String?

    var displayTitle: String { name ?? title ?? id }
    var displayKind: String { type ?? "movie" }
}

struct ArgusEpisode: Identifiable, Codable, Hashable {
    let id: String
    let title: String?
    let season: Int?
    let episode: Int?
    let overview: String?
    let thumbnail: String?
}

struct ArgusMediaDetail: Codable {
    let id: String
    let name: String?
    let type: String?
    let poster: String?
    let background: String?
    let description: String?
    let releaseInfo: String?
    let imdbRating: String?
    let genres: [String]?
    let videos: [ArgusEpisode]?
}

@MainActor
final class ArgusTVStore: ObservableObject {
    @Published var host: String {
        didSet { UserDefaults.standard.set(host, forKey: "argus.tv.host") }
    }
    @Published var macItems: [ArgusMediaItem] = []
    @Published var topMovies: [ArgusMediaItem] = []
    @Published var topSeries: [ArgusMediaItem] = []
    @Published var searchResults: [ArgusMediaItem] = []
    @Published var watchlistIds: Set<String> = []
    @Published var activePlayer: AVPlayer?
    @Published var statusText = "Ready"

    init() {
        self.host = UserDefaults.standard.string(forKey: "argus.tv.host") ?? "http://192.168.1.10:3456"
        if let saved = UserDefaults.standard.array(forKey: "argus.tv.watchlist") as? [String] {
            self.watchlistIds = Set(saved)
        }
    }

    func toggleWatchlist(_ id: String) {
        if watchlistIds.contains(id) { watchlistIds.remove(id) } else { watchlistIds.insert(id) }
        UserDefaults.standard.set(Array(watchlistIds), forKey: "argus.tv.watchlist")
    }

    func loadAll() async {
        statusText = "Loading catalogs..."
        async let moviesTask: [ArgusMediaItem] = fetchCatalog("https://v3-cinemeta.strem.io/catalog/movie/top.json")
        async let seriesTask: [ArgusMediaItem] = fetchCatalog("https://v3-cinemeta.strem.io/catalog/series/top.json")
        async let macTask: [ArgusMediaItem] = fetchMacLibrary()
        let (m, s, mac) = await (moviesTask, seriesTask, macTask)
        topMovies = m
        topSeries = s
        macItems = mac
        statusText = "\(m.count + s.count) catalog titles · \(mac.count) Mac synced"
    }

    private func fetchCatalog(_ urlStr: String) async -> [ArgusMediaItem] {
        guard let url = URL(string: urlStr),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let decoded = try? JSONDecoder().decode(CinemetaCatalogResponse.self, from: data) else {
            return []
        }
        return Array(decoded.metas.prefix(24))
    }

    private func fetchMacLibrary() async -> [ArgusMediaItem] {
        guard let url = URL(string: "\(host)/api/remote/library"),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let decoded = try? JSONDecoder().decode([ArgusMediaItem].self, from: data) else {
            return []
        }
        return decoded
    }

    func search(_ query: String) async {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty,
              let enc = q.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else {
            searchResults = []
            return
        }
        async let m = fetchCatalog("https://v3-cinemeta.strem.io/catalog/movie/top/search=\(enc).json")
        async let s = fetchCatalog("https://v3-cinemeta.strem.io/catalog/series/top/search=\(enc).json")
        let (mr, sr) = await (m, s)
        searchResults = mr + sr
    }

    func fetchDetail(for item: ArgusMediaItem) async -> ArgusMediaDetail? {
        let kind = item.displayKind == "series" ? "series" : "movie"
        guard let url = URL(string: "https://v3-cinemeta.strem.io/meta/\(kind)/\(item.id).json"),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let decoded = try? JSONDecoder().decode(CinemetaMetaResponse.self, from: data) else {
            return nil
        }
        return decoded.meta
    }

    func sendCommand(_ cmd: String) async {
        guard let url = URL(string: "\(host)/api/remote/command?cmd=\(cmd)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        _ = try? await URLSession.shared.data(for: req)
    }

    func playUrl(_ raw: String?) {
        guard let raw, let url = URL(string: raw) else { return }
        activePlayer = AVPlayer(url: url)
        activePlayer?.play()
    }
}

struct HarborPosterCard: View {
    let item: ArgusMediaItem

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            AsyncImage(url: URL(string: item.poster ?? "")) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    ZStack {
                        Color.white.opacity(0.08)
                        Image(systemName: "film")
                            .font(.title)
                            .foregroundStyle(.white.opacity(0.45))
                    }
                }
            }
            .frame(width: 240, height: 350)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
            )

            Text(item.displayTitle)
                .font(.callout.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .frame(width: 240, alignment: .leading)

            HStack(spacing: 8) {
                if let yr = item.releaseInfo, !yr.isEmpty {
                    Text(yr).font(.caption).foregroundStyle(.white.opacity(0.6))
                }
                if let rating = item.imdbRating, !rating.isEmpty {
                    Text("★ \(rating)")
                        .font(.caption.bold())
                        .foregroundStyle(Color(red: 0.92, green: 0.69, blue: 0.42))
                }
            }
        }
    }
}

struct ArgusTVDetailView: View {
    let item: ArgusMediaItem
    @ObservedObject var store: ArgusTVStore
    @State private var detail: ArgusMediaDetail?

    private let harborBg = Color(red: 0.07, green: 0.075, blue: 0.09)
    private let harborAccent = Color(red: 0.92, green: 0.69, blue: 0.42)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                HStack(alignment: .top, spacing: 36) {
                    AsyncImage(url: URL(string: detail?.poster ?? item.poster ?? "")) { phase in
                        if case .success(let img) = phase {
                            img.resizable().scaledToFill()
                        } else {
                            Color.white.opacity(0.08)
                        }
                    }
                    .frame(width: 280, height: 410)
                    .clipShape(RoundedRectangle(cornerRadius: 20))

                    VStack(alignment: .leading, spacing: 16) {
                        Text(detail?.name ?? item.displayTitle)
                            .font(.largeTitle.bold())
                            .foregroundStyle(.white)

                        HStack(spacing: 14) {
                            if let yr = detail?.releaseInfo ?? item.releaseInfo {
                                Text(yr).foregroundStyle(.white.opacity(0.7))
                            }
                            if let rating = detail?.imdbRating ?? item.imdbRating {
                                Text("IMDb ★ \(rating)")
                                    .fontWeight(.bold)
                                    .foregroundStyle(harborAccent)
                            }
                            if let genres = detail?.genres?.prefix(3), !genres.isEmpty {
                                Text(genres.joined(separator: " · "))
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                        }
                        .font(.callout)

                        Text(detail?.description ?? item.description ?? "No synopsis available.")
                            .font(.body)
                            .foregroundStyle(.white.opacity(0.85))
                            .lineLimit(5)

                        HStack(spacing: 18) {
                            if item.streamUrl != nil {
                                Button("Play Stream") { store.playUrl(item.streamUrl) }
                                    .buttonStyle(.borderedProminent)
                                    .tint(harborAccent)
                            }
                            Button(store.watchlistIds.contains(item.id) ? "In Watchlist ✓" : "+ Watchlist") {
                                store.toggleWatchlist(item.id)
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding(.top, 8)
                    }
                }

                if let episodes = detail?.videos, !episodes.isEmpty {
                    Text("Episodes (\(episodes.count))")
                        .font(.title3.weight(.semibold))
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(episodes.prefix(30)) { ep in
                            HStack(spacing: 16) {
                                Text("S\(ep.season ?? 1)E\(ep.episode ?? 1)")
                                    .font(.caption.bold())
                                    .foregroundStyle(harborAccent)
                                    .frame(width: 80, alignment: .leading)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(ep.title ?? ep.id).font(.headline)
                                    if let ov = ep.overview, !ov.isEmpty {
                                        Text(ov).font(.caption).foregroundStyle(.white.opacity(0.65)).lineLimit(2)
                                    }
                                }
                                Spacer()
                            }
                            .padding(16)
                            .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
                        }
                    }
                }
            }
            .padding(48)
        }
        .background(harborBg.ignoresSafeArea())
        .task { detail = await store.fetchDetail(for: item) }
    }
}

struct HarborTVShelf: View {
    let title: String
    let items: [ArgusMediaItem]
    @ObservedObject var store: ArgusTVStore

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white.opacity(0.92))
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 24) {
                    ForEach(items) { item in
                        NavigationLink {
                            ArgusTVDetailView(item: item, store: store)
                        } label: {
                            HarborPosterCard(item: item)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 8)
            }
        }
    }
}

@main
struct ArgusTVApp: App {
    @StateObject private var store = ArgusTVStore()
    @State private var query = ""
    private let harborBg = Color(red: 0.07, green: 0.075, blue: 0.09)
    private let harborAccent = Color(red: 0.92, green: 0.69, blue: 0.42)

    var body: some Scene {
        WindowGroup {
            TabView {
                NavigationStack {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 36) {
                            HStack {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("ARGUS")
                                        .font(.largeTitle.bold())
                                        .foregroundStyle(.white)
                                    Text(store.statusText)
                                        .font(.callout)
                                        .foregroundStyle(.white.opacity(0.65))
                                }
                                Spacer()
                                Button("Refresh") { Task { await store.loadAll() } }
                                    .buttonStyle(.borderedProminent)
                                    .tint(harborAccent)
                            }
                            if !store.macItems.isEmpty {
                                HarborTVShelf(title: "Synced from Mac", items: store.macItems, store: store)
                            }
                            HarborTVShelf(title: "Top Movies", items: store.topMovies, store: store)
                            HarborTVShelf(title: "Top Series", items: store.topSeries, store: store)
                        }
                        .padding(48)
                    }
                    .background(harborBg.ignoresSafeArea())
                }
                .tabItem { Label("Home", systemImage: "house.fill") }

                NavigationStack {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            TextField("Search movies & shows...", text: $query)
                                .padding(14)
                                .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
                                .onSubmit { Task { await store.search(query) } }
                            if !store.searchResults.isEmpty {
                                HarborTVShelf(title: "Results", items: store.searchResults, store: store)
                            }
                        }
                        .padding(48)
                    }
                    .background(harborBg.ignoresSafeArea())
                }
                .tabItem { Label("Search", systemImage: "magnifyingglass") }

                NavigationStack {
                    ScrollView {
                        let saved = (store.topMovies + store.topSeries + store.macItems)
                            .filter { store.watchlistIds.contains($0.id) }
                        VStack(alignment: .leading, spacing: 24) {
                            Text("Watchlist")
                                .font(.largeTitle.bold())
                            if saved.isEmpty {
                                Text("Add movies or shows from any detail page.")
                                    .foregroundStyle(.white.opacity(0.6))
                            } else {
                                HarborTVShelf(title: "Saved", items: saved, store: store)
                            }
                        }
                        .padding(48)
                    }
                    .background(harborBg.ignoresSafeArea())
                }
                .tabItem { Label("Library", systemImage: "bookmark.fill") }

                VStack(spacing: 28) {
                    Text("Mac Remote & Host").font(.title.bold())
                    TextField("Mac Argus URL (e.g. http://192.168.1.10:3456)", text: $store.host)
                        .padding(14)
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
                    HStack(spacing: 24) {
                        Button("Previous") { Task { await store.sendCommand("previous") } }
                        Button("Play / Pause") { Task { await store.sendCommand("playpause") } }
                            .buttonStyle(.borderedProminent)
                            .tint(harborAccent)
                        Button("Next") { Task { await store.sendCommand("next") } }
                    }
                }
                .padding(60)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(harborBg.ignoresSafeArea())
                .tabItem { Label("Remote", systemImage: "appletvremote.gen4.fill") }
            }
            .fullScreenCover(isPresented: Binding(
                get: { store.activePlayer != nil },
                set: { if !$0 { store.activePlayer?.pause(); store.activePlayer = nil } }
            )) {
                if let player = store.activePlayer {
                    VideoPlayer(player: player).ignoresSafeArea()
                }
            }
            .task { await store.loadAll() }
        }
    }
}
