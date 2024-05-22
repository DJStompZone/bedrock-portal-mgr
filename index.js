const { BedrockPortal, Joinability, Modules: { AutoFriendAdd, InviteOnMessage } } = require('bedrock-portal');
const { Authflow } = require('prismarine-auth');
const fs = require('fs');
const pm2 = require('pm2');
const tx2 = require('tx2');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const authflow = new Authflow('', './authCache/');

const startPortal = async () => {
  const portal = new BedrockPortal(authflow, {
    ip: config.ip,
    port: config.port,
    world: config.world,
    joinability: Joinability[config.joinability],
  });

  const moduleConfigurations = {
    AutoFriendAdd: AutoFriendAdd,
    InviteOnMessage: InviteOnMessage
  };

  Object.keys(moduleConfigurations).forEach(key => {
    if (config.modules[key]) {
      portal.use(moduleConfigurations[key], config.modules[key]);
    }
  });

  Object.entries(config.subscribeToEvents).forEach(([eventName, logMessage]) => {
    const eventCounter = tx2.counter(`${config.appName} - ${logMessage}`);
    portal.on(eventName, (data) => {
      console.log(`${logMessage}:`, data);
      eventCounter.inc();
    });
  });

  try {
    await portal.start();
    console.log(`${config.appName} started successfully`);
  } catch (error) {
    console.error(`Error starting ${config.appName}:`, error);
    process.exit(1);
  }
};

pm2.connect((err) => {
  if (err) {
    console.error(`Error connecting to PM2 for ${config.appName}:`, err);
    process.exit(2);
  }

  pm2.launchBus((err, bus) => {
    if (err) {
      console.error(`Error launching PM2 bus for ${config.appName}:`, err);
      process.exit(2);
    }

    bus.on('log:err', (packet) => {
      console.error(`[${config.appName}:%s] %s`, packet.process.name, packet.data);
    });

    bus.on('log:out', (packet) => {
      console.log(`[${config.appName}:%s] %s`, packet.process.name, packet.data);
    });
  });

  startPortal();
});

