import si from "systeminformation";

export async function GET(req: Request) {
  const detail = new URL(req.url).searchParams.get("detail") === "1";

  try {
    if (detail) {
      const [load, mem, disk, cpu, temp, net, os, battery, procs] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.cpu(),
        si.cpuTemperature().catch(() => null),
        si.networkStats().catch(() => []),
        si.osInfo(),
        si.battery().catch(() => null),
        si.processes().catch(() => null),
      ]);

      const diskMain = disk.find((d) => d.mount === "/") ?? disk[0];
      const iface = (net as si.Systeminformation.NetworkStatsData[])[0];

      return Response.json({
        // summary
        cpu: Math.round(load.currentLoad),
        ram: Math.round((mem.used / mem.total) * 100),
        ramUsedGB: Math.round((mem.used / 1073741824) * 10) / 10,
        ramTotalGB: Math.round(mem.total / 1073741824),
        disk: diskMain ? Math.round((diskMain.used / diskMain.size) * 100) : 0,
        diskUsedGB: diskMain ? Math.round(diskMain.used / 1073741824) : 0,
        diskTotalGB: diskMain ? Math.round(diskMain.size / 1073741824) : 0,

        // cpu detail
        cpuModel: `${cpu.manufacturer} ${cpu.brand}`.trim(),
        cpuCores: cpu.cores,
        cpuPhysical: cpu.physicalCores,
        cpuSpeed: cpu.speed,
        cpuTemp: temp?.main ?? null,
        cpuPerCore: load.cpus?.map((c) => Math.round(c.load)) ?? [],

        // memory detail
        ramAvailGB: Math.round((mem.available / 1073741824) * 10) / 10,
        swapUsedGB: Math.round((mem.swapused / 1073741824) * 10) / 10,
        swapTotalGB: Math.round((mem.swaptotal / 1073741824) * 10) / 10,

        // network
        netUp: iface ? Math.round(iface.tx_sec / 1024) : 0,
        netDown: iface ? Math.round(iface.rx_sec / 1024) : 0,
        netIface: iface?.iface ?? null,

        // os
        osName: os.distro,
        osVersion: os.release,
        hostname: os.hostname,
        arch: os.arch,
        uptime: os.uptime ?? Math.floor(process.uptime()),

        // battery
        battery: battery?.hasBattery
          ? {
              percent: Math.round(battery.percent),
              charging: battery.isCharging,
              timeRemaining: battery.timeRemaining > 0 ? battery.timeRemaining : null,
            }
          : null,

        // processes
        processes: procs?.all ?? null,
        processesRunning: procs?.running ?? null,
      });
    }

    // lean summary for the main widget polling
    const [load, mem, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
    ]);

    const diskMain = disk.find((d) => d.mount === "/") ?? disk[0];

    return Response.json({
      cpu: Math.round(load.currentLoad),
      ram: Math.round((mem.used / mem.total) * 100),
      ramUsedGB: Math.round((mem.used / 1073741824) * 10) / 10,
      ramTotalGB: Math.round(mem.total / 1073741824),
      disk: diskMain ? Math.round((diskMain.used / diskMain.size) * 100) : 0,
      diskUsedGB: diskMain ? Math.round(diskMain.used / 1073741824) : 0,
      diskTotalGB: diskMain ? Math.round(diskMain.size / 1073741824) : 0,
    });
  } catch {
    return Response.json({ error: "Failed to read system info" }, { status: 500 });
  }
}
