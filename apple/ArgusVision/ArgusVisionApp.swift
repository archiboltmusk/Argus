import SwiftUI
import AVKit

struct VisionCatalogResp: Codable {
    let metas: [VisionMediaItem]
}

struct VisionMediaItem: Identifiable, Codable, Hashable {
    let id: String
    let name: String?
    let title: String?
    let type: String?
    let poster: String?
    let description: String?
    let releaseInfo: String?
    let imdbRating: String?
    let streamUrl: String?

    var displayTitle: String { name ?? title ?? id }
}

@MainActor
final class ArgusVisionStore: ObservableObject {
    @Published var host: String {
        didSet { UserDefaults.standard.set(host, forKey: "argus.vision.host") }
    }
    @Published var movies: [VisionMediaItem] = []
    @Published var series: [VisionMediaItem] = []
    @Published var macItems: [VisionMediaItem] = []
    @Published var searchResults: [VisionMediaItem] = []
    @Published var selectedPlayer: AVPlayer?
    @Published var selectedItem: VisionMediaItem?

    init() {
        self.host = UserDefaults.standard.string(forKey: "argus.vision.host") ?? "http://192.168.1.10:3456"
    }

    func loadAll() async {
        async let m = fetchCatalog("https://v3-cinemeta.strem.io/catalog/movie/top.json")
        async let s = fetchCatalog("https://v3-cinemeta.strem.io/catalog/series/top.json")
        async let mac = fetchMac()
        let (mr, sr, macr) = await (m, s, mac)
        movies = mr
        series = sr
        macItems = macr
    }

    private func fetchCatalog(_ urlStr: String) async -> [VisionMediaItem] {
        guard let url = URL(string: urlStr),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let decoded = try? JSONDecoder().decode(VisionCatalogResp.self, from: data) else {
            return []
        }
        return Array(decoded.metas.prefix(30))
    }

    private func fetchMac() async -> [VisionMediaItem] {
        guard let url = URL(string: "\(host)/api/remote/library"),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let decoded = try? JSONDecoder().decode([VisionMediaItem].self, from: data) else {
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

    func play(_ item: VisionMediaItem) {
        guard let raw = item.streamUrl, let url = URL(string: raw) else { return }
        selectedPlayer = AVPlayer(url: url)
        selectedPlayer?.play()
    }
}

@main
struct ArgusVisionApp: App {
    @StateObject private var store = ArgusVisionStore()
    @State private var section: String? = "Home"
    @State private var query = ""
    private let harborAccent = Color(red: 0.92, green: 0.69, blue: 0.42)

    private var activeItems: [VisionMediaItem] {
        switch section {
        case "Movies": return store.movies
        case "Shows": return store.series
        case "Search": return store.searchResults
        case "Mac Sync": return store.macItems
        default: return store.macItems + store.movies + store.series
        }
    }

    var body: some Scene {
        WindowGroup {
            NavigationSplitView {
                List(selection: $section) {
                    ForEach(["Home", "Movies", "Shows", "Search", "Mac Sync"], id: \.self) { entry in
                        Text(entry).tag(entry)
                    }
                }
                .navigationTitle("Argus")
            } detail: {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        Text(section ?? "Home")
                            .font(.largeTitle.bold())
                        Spacer()
                        if section == "Mac Sync" {
                            TextField("Mac URL", text: $store.host)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 260)
                        }
                        Button("Sync") { Task { await store.loadAll() } }
                            .buttonStyle(.borderedProminent)
                            .tint(harborAccent)
                    }

                    if section == "Search" {
                        TextField("Search movies & shows...", text: $query)
                            .textFieldStyle(.roundedBorder)
                            .onSubmit { Task { await store.search(query) } }
                    }

                    if let player = store.selectedPlayer {
                        VideoPlayer(player: player)
                            .frame(height: 360)
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                    }

                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 18)], spacing: 18) {
                            ForEach(activeItems) { item in
                                Button {
                                    selectedDetailOrPlay(item)
                                } label: {
                                    VStack(alignment: .leading, spacing: 8) {
                                        AsyncImage(url: URL(string: item.poster ?? "")) { phase in
                                            if case .success(let img) = phase {
                                                img.resizable().scaledToFill()
                                            } else {
                                                Color.white.opacity(0.08)
                                            }
                                        }
                                        .frame(height: 240)
                                        .clipShape(RoundedRectangle(cornerRadius: 14))

                                        Text(item.displayTitle)
                                            .font(.headline)
                                            .lineLimit(1)
                                        HStack(spacing: 8) {
                                            if let yr = item.releaseInfo {
                                                Text(yr).font(.caption).foregroundStyle(.secondary)
                                            }
                                            if let r = item.imdbRating {
                                                Text("★ \(r)").font(.caption.bold()).foregroundStyle(harborAccent)
                                            }
                                        }
                                    }
                                    .padding(12)
                                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(28)
            }
            .sheet(item: $store.selectedItem) { item in
                VStack(alignment: .leading, spacing: 16) {
                    Text(item.displayTitle).font(.title.bold())
                    Text(item.description ?? "Sync stream URL from your Mac Argus app to play directly in visionOS.")
                        .foregroundStyle(.secondary)
                    HStack {
                        if item.streamUrl != nil {
                            Button("Play") { store.play(item); store.selectedItem = nil }
                                .buttonStyle(.borderedProminent)
                                .tint(harborAccent)
                        }
                        Button("Close") { store.selectedItem = nil }
                    }
                }
                .padding(32)
                .frame(minWidth: 440)
            }
            .task { await store.loadAll() }
        }
    }

    private func selectedDetailOrPlay(_ item: VisionMediaItem) {
        if item.streamUrl != nil {
            store.play(item)
        } else {
            store.selectedItem = item
        }
    }
}
