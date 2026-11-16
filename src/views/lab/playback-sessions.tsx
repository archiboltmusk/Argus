import { useEffect, useState } from "react";
import {
  clearPlaybackTraceReports,
  readPlaybackTraceReports,
  subscribePlaybackTraceReports,
} from "@/lib/perf/playback-trace";

export function PlaybackSessions() {
  const [reports, setReports] = useState(readPlaybackTraceReports);
  useEffect(() => subscribePlaybackTraceReports(() => setReports(readPlaybackTraceReports())), []);
  return (
    <section className="mb-6 rounded-2xl border border-edge-soft bg-surface/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Actual playback sessions</h2>
        <button
          className="rounded-lg border border-edge-soft px-3 py-2 text-sm"
          onClick={clearPlaybackTraceReports}
        >
          Clear sessions
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        Last 20 attempts in this app session. Timings come from the player; no media names, URLs, or
        account details are retained. First frame is measured from source selection, including
        resolution.
      </p>
      {!reports.length ? (
        <p className="mt-4 text-sm">
          Play a title, then return here to inspect its measured timings.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2">Source</th>
                <th className="p-2">Outcome</th>
                <th className="p-2">Resolved</th>
                <th className="p-2">First frame</th>
                <th className="p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-edge-soft">
                  <td className="p-2">{report.sourceClass}</td>
                  <td className="p-2">
                    {report.milestones["rollback-ready"] != null
                      ? "Failed switch; original restored"
                      : report.milestones["recovery-start"] != null
                        ? `Switch ${report.outcome}`
                        : report.outcome}
                  </td>
                  <td className="p-2">
                    {report.milestones["resolve-ready"] == null
                      ? "—"
                      : `${report.milestones["resolve-ready"]} ms`}
                  </td>
                  <td className="p-2">
                    {report.milestones["first-frame"] == null
                      ? "—"
                      : `${report.milestones["first-frame"]} ms`}
                  </td>
                  <td className="p-2">{report.totalMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reports
        .filter((report) => report.decision)
        .map((report) => (
          <details key={report.id} className="mt-3 rounded border border-edge-soft p-3 text-sm">
            <summary>
              {report.sourceClass}: {report.decision!.mode} selection · score{" "}
              {report.decision!.score}
            </summary>
            <p className="mt-2">
              {report.decision!.candidates} ranked candidates; {report.decision!.rejected} rejected
              by the source pipeline.
            </p>
            <ul>
              {report.decision!.reasons.map((reason, index) => (
                <li key={index}>
                  {reason.signal}: {reason.delta > 0 ? "+" : ""}
                  {reason.delta}
                </li>
              ))}
            </ul>
          </details>
        ))}
    </section>
  );
}
