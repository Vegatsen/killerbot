var Discord = require('discord.js');
var logger = require('winston');
var Albion = require('albion-api');
var fs = require("fs");
//Global list of used killID's
//Will eventualy be switched to a database
var killList;
var killFile;

const bot = new Discord.Client()
bot.login(process.env.token);

//Read eventID file to get a list of all posted events
fs.readFile('./eventID.json', 'utf8', function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
		var obj = JSON.parse(data);
		killList = obj;
	}
});
	
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
	
logger.level = 'debug';

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
	//Initial check for kills
	check_Kill();
	//Runs Kill post function every 60seconds
	setInterval(function(){check_Kill();}, 60000);
	
});
function check_Kill(){
	//I have modified the Albion API here for the getRecentEvents fuction.
	Albion.getRecentEvents("51", function(rs,cb){
		//the getRectEvents "51" tells me how many event to look at, can be 1-51.
		console.log('test');
		var EventID = "";
		for (i in cb)
		{
			EventID = cb[i].EventId;
			if(cb[i].Killer["GuildName"] == "Mess Age")
			{
				if(killList.kills.indexOf(EventID) == -1)
				{
					killList.kills.push(EventID); // Add EventID to list
					killLFile = JSON.stringify(killList);
					fs.writeFile('eventID.json', killLFile, 'utf8', function(){}); //Writes eventID to file so bot remebers
					
					//Post Message---------------------------------------------------------------
					Albion.getEventDetails(EventID, function(rs,cb){
						//This sequence will get the Killers mainhand weapon
						var wep = cb.Killer.Equipment.MainHand.Type;
						var wepC = cb.Killer.Equipment.MainHand.Count;
						var wepQ = cb.Killer.Equipment.MainHand.Quality;
						//Creates url for mainhand weapon picture
						var imgurl = "https://gameinfo.albiononline.com/api/gameinfo/items/" + wep + ".png?count=" + wepC + "&quality=" + wepQ
						//Puts number of participants into number format
						var player = parseInt(cb.numberOfParticipants);
						//Number of participants minus the player equils assists
						var numAssist = player - 1;
						//Total damage done
						var damage = 0;
						//Killers damage
						var killerDMG = 0;
						//Loops though to total up all the damage done.
						for(n in cb.Participants)
						{
							damage += cb.Participants[n].DamageDone;
							if(cb.Participants[n].Name == cb.Killer["Name"])
							{
								killerDMG = cb.Participants[n].DamageDone;
							}
						}
						//Caculates the percentage of damage done by the player.
						var dmgPercent = Math.round((killerDMG / damage) * 100);
						bot.channels.get('463025518351089664').send({embed:
							{ 
								title: cb.Killer["Name"] + " of " + cb.Killer["GuildName"],
								description: "**Victim**: " + cb.Victim["Name"] + "\n" +
											 "**KillFame**: " + cb.TotalVictimKillFame + "\n" +
											 "**VictimAlliance**: " + cb.Victim["AllianceName"] + "\n" +
											 "**VictimGuild**: " + cb.Victim["GuildName"] + "\n" +
											 "**DamageDone**: " + dmgPercent + "%" + "\n" +
											 "**Assists**: " + numAssist ,
											 
								url: "https://albiononline.com/en/killboard/kill/" + cb.EventId,
								thumbnail:{
									url: imgurl,
								},
							}
						});
					});
				}
			}
		}	
	});
}
