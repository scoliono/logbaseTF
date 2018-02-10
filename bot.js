// LogBaseTF
// Copyright (c) James Shiffer 2018

var got = require('got'),
    discord = require('discord.js'),
    cp = require('child_process'),
    path = require('path'),
    fs = require('fs'),
    config = require(path.join(__dirname, 'auth.json')),
    options = require(path.join(__dirname, 'options.json'));

const webhook = new discord.WebhookClient(config.id, config.token);

//TODO: Implement dynamic rate-limiting
var delay = config.delay;
var last_date = new Date().getTime() / 1000;

function pretty_class_name(str)
{
    return str.charAt(0).toUpperCase() + str.slice(1, str === 'heavyweapons' ? 5 : str.length);
}

function sort_classes(a, b)
{
    let classes = ['scout', 'soldier', 'pyro', 'demoman', 'heavyweapons', 'engineer', 'medic', 'sniper', 'spy'];
    return classes.indexOf(a.class_stats[0].type) - classes.indexOf(b.class_stats[0].type);
}

function toMMSS(num)
{
    var sec_num = parseInt(num, 10); // don't forget the second param
    var minutes = Math.floor(sec_num / 60);
    var seconds = sec_num - (minutes * 60);

    if (minutes < 10) minutes = '0' + minutes;
    if (seconds < 10) seconds = '0' + seconds;
    return minutes + ':' + seconds;
}

async function poll_logstf()
{
    console.log(`Polling logs.tf (SteamID: ${config.steamid64})`);
    let response = await got(`https://logs.tf/json_search?player=${config.steamid64}`);
    let { logs } = JSON.parse(response.body);

    for (let log of logs)
    {
        if (log.date > last_date)
        {
            console.log(`Found new log (#${log.id})`);
            last_date = log.date;

            let log_request = await got(`https://logs.tf/json/${log.id}`);
            let log_data = JSON.parse(log_request.body);

            let author = await got(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.steamapi}&steamids=${config.steamid64}`);
            let author_player = JSON.parse(author.body).response.players[0];

            let red_players = [], blu_players = [];
            for (let name in log_data.names)
            {
                let player = log_data.players[name];
                player.name = log_data.names[name];
                
                if (player.team === 'Red')
                    red_players.push(player);
                else if (player.team === 'Blue')
                    blu_players.push(player);
            }

            red_players.sort(sort_classes);
            blu_players.sort(sort_classes);

            let red_player_str = '', blu_player_str = '';
            for (let player of red_players)
            {
                red_player_str += `${pretty_class_name(player.class_stats[0].type)}: **${player.name}**\n`;
            }
            for (let player of blu_players)
            {
                blu_player_str += `${pretty_class_name(player.class_stats[0].type)}: **${player.name}**\n`;
            }

            let embed = new discord.RichEmbed()
                .setAuthor(author_player.personaname, author_player.avatar)
                .setColor('#33CC33')
                .setTitle(log.title)
                .setDescription(`BLU: ${log_data.teams.Blue.score} | RED: ${log_data.teams.Red.score} | ${toMMSS(log_data.length)}`)
                .setURL(`https://logs.tf/${log.id}`)
                .setThumbnail('http://logs.tf/assets/img/logo-social.png')
                .setTimestamp()
                .addField('BLU', blu_player_str)
                .addField('RED', red_player_str);
            
            webhook.send(embed);
        }
    }
}

// Start
(async () => {
    console.log(`Webhook started (ID: ${config.id})`);

    let proc = cp.fork(path.join(__dirname, 'bin', 'www'));
    console.log(`Webserver launched`);
    
    await poll_logstf();

    // Reload config every so often
    setInterval(() => {
        options = JSON.parse(fs.readFileSync(path.join(__dirname, 'options.json')));
        if (options.enabled === 'on')
        {
            setTimeout(async () => {
                await poll_logstf();
            }, delay);
        }
    }, 5000);
})();
