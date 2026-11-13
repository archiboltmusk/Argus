import SwiftUI
import AVKit

struct ArgusMediaItem: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let subtitle: String?
    let streamUrl: String?
}

@MainActor
final class ArgusTVStore: ObservableObject {
    @Published var host: String {
        didSet { UserDefaults.standard.set(host, forKey: "argus.tv.host") }
    }
    @Published var items: [ArgusMediaItem] = []
    @Published var statusText = "Connect to your Mac running Argus"
    @Published var activePlayer: AVPlayer?

    init() {
        self.host = UserDefaults.standard.string(forKey: "argus.tv.host") ?? "http://192.168.1.10:3456"
    }

    func refresh() async {
        guard let url = URL(string: "\(host)/api/remote/library") else {
            statusText = "Invalid host URL"
            return
        }
        statusText = "Syncing with Argus..."
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            items = try JSONDecoder().decode([ArgusMediaItem].self, from: data)
            statusText = items.isEmpty ? "No items yet" : "\(items.count) titles ready"
        } catch {
            statusText = "Offline: \(error.localizedDescription)"
        }
    }

    func play(_ item: ArgusMediaItem) {
        guard let raw = item.streamUrl, let url = URL(string: raw) else { return }
        activePlayer = AVPlayer(url: url)
        activePlayer?.play()
    }
}

@main
struct ArgusTVApp: App {
    @StateObject private var store = ArgusTVStore()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                ZStack {
                    Color(red: 0.07, green: 0.075, blue: 0.09).ignoresSafeArea()
                    VStack(alignment: .leading, spacing: 28) {
                        HStack {
                            Text("Argus TV")
                                .font(.largeTitle.bold())
                                .foregroundStyle(.white)
                            Spacer()
                            Text(store.statusText)
                                .font(.callout)
                                .foregroundStyle(.white.opacity(0.65))
                            Button("Sync") {
                                Task { await store.refresh() }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Color(red: 0.92, green: 0.69, blue: 0.42))
                        }

                        TextField("Mac Argus URL (e.g. http://192.168.1.10:3456)", text: $store.host)
                            .textFieldStyle(.plain)
                            .padding(14)
                            .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))

                        ScrollView(.horizontal, showsIndicators: false) {
                            LazyHStack(spacing: 24) {
                                ForEach(store.items) { item in
                                    Button {
                                        store.play(item)
                                    } label: {
                                        VStack(alignment: .leading, spacing: 8) {
                                            Text(item.title)
                                                .font(.headline)
                                                .lineLimit(2)
                                            if let sub = item.subtitle {
                                                Text(sub)
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                            }
                                        }
                                        .frame(width: 320, height: 180, alignment: .bottomLeading)
                                        .padding(20)
                                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
                                    }
                                    .buttonStyle(.card)
                                }
                            }
                            .padding(.vertical, 8)
                        }
                    }
                    .padding(48)
                }
                .fullScreenCover(isPresented: Binding(
                    get: { store.activePlayer != nil },
                    set: { if !$0 { store.activePlayer?.pause(); store.activePlayer = nil } }
                )) {
                    if let player = store.activePlayer {
                        VideoPlayer(player: player)
                            .ignoresSafeArea()
                    }
                }
            }
            .task { await store.refresh() }
        }
    }
}
