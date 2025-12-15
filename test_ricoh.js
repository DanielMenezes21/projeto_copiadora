const net = require("net");

const ip = "192.168.10.132";
const ports = [9100, 515, 631];

function testPort(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on("connect", () => {
            console.log(`✔ Porta ${port} ABERTA`);
            socket.destroy();
            resolve(true);
        });

        socket.on("timeout", () => {
            console.log(`⏱ Porta ${port} TIMEOUT`);
            socket.destroy();
            resolve(false);
        });

        socket.on("error", () => {
            console.log(`❌ Porta ${port} FECHADA ou rejeitada`);
            resolve(false);
        });

        socket.connect(port, ip);
    });
}

(async () => {
    console.log(`Testando impressora ${ip}...\n`);
    for (const port of ports) {
        await testPort(port);
    }
})();
