import SwiftUI
import AVKit

struct VisionMediaItem: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let subtitle: String?
    let streamUrl: String?
}

@MainActor
final class ArgusVisionStore: ObservableObject {
    @Published var host = UserDefaults.standard.string(forKey: "argus.vision.host") ?? "http://192.168.1.10:3456"
    @Published var items: [VisionMediaItem] = []
    @Published var selectedPlayer: AVPlayer?

    func refresh() async {
        guard let url = URL(string: "\(host)/api/remote/library") else { return }
        if let (data, _) = try? await URLSession.shared.data(from: url),
           let decoded = try? JSONDecoder().decode([VisionMediaItem].self, from: data) {
            items = decoded
        }
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

    var body: some Scene {
        WindowGroup {
            NavigationSplitView {
                List(selection: $section) {
                    ForEach(["Home", "Movies", "Shows", "Music"], id: \.self) { entry in
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
                        Button("Sync") { Task { await store.refresh() } }
                            .buttonStyle(.borderedProminent)
                    }
                    if let player = store.selectedPlayer {
                        VideoPlayer(player: player)
                            .frame(height: 360)
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                    }
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 18)], spacing: 18) {
                            ForEach(store.items) { item in
                                Button { store.play(item) } label: {
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(item.title).font(.headline).lineLimit(2)
                                        if let sub = item.subtitle {
                                            Text(sub).font(.caption).foregroundStyle(.secondary)
                                        }
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 110, alignment: .bottomLeading)
                                    .padding(16)
                                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(28)
            }
            .task { await store.refresh() }
        }
    }
}
