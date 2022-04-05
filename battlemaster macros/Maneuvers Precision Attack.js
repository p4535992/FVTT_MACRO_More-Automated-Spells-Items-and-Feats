/*****
Fighter Battlemaster Maneuver: Precision Attack

USEAGE : PLACE HOLDER
This item should be placed on the character that has the Precision Attack Manuever.  
This items places an effect on the Actor that allows the rolling of a Superiority Die to 
be added to the attack Roll before the TO HIT is evaluated.
 
MANEUVER DESCRIPTION:
When you make a weapon attack roll against a creature, you can expend one superiority die 
to add it to the roll. You can use this maneuver before or after making the attack roll, 
but before any effects of the attack are applied.

v0.8 March 28 2022 jbowens #0415 (Discord) https://github.com/jbowensii/More-Automated-Spells-Items-and-Feats.git 
*****/
const workflow = MidiQOL.Workflow.getWorkflow(args[0].uuid);

if (args[0].macroPass === "preCheckHits") {
    const theItem = workflow;

    if ((theItem != null) && (theItem.name != "Maneuvers: Precision Attack")) {
        // define Actor, Target and Item
        const pcActor = MidiQOL.MQfromActorUuid(args[0].actorUuid);
        
        // Find Superiority Dice Resource
        let resource = await findSheetResource(pcActor, "Superiority Dice");
        if (!resource) { 
            ui.notifications.error("Could not find a recource labeled 'Superiority Dice'..."); 
            return;
        } 

        // No more Superiority Dice
        let superiorityDice = resource.value;
        if (superiorityDice < 1) return;

        // check to make sure only one target is selected
        if ((args[0].targetUuids.length < 1) || (args[0].targetUuids.length > 1)) {
            ui.notifications.error("You need to select a single target.");
            return;
        }

        let superiorityDie = pcActor.getFlag("dae", "SuperiorityDie");
        if (superiorityDie === null) {
            ui.notifications.error("You are not a fighter battle master of at least 3rd level!");
            return;
        }

        // make sure the attempted hit was made with a weapon attack
        if (!["mwak","rwak"].includes(args[0].item.data.actionType)) {
            ui.notifications.error("Precision Attack only works with a weapon attack");  
            return;       
        }
        
        // create a dialog and prompt to spend a superiority die
        let useSuperiorityDie = false;        
        if (superiorityDice > 0) {
            let dialog = new Promise((resolve, reject) => {
                new Dialog({
                    // localize this text
                    title: "Battle Master: Precision Attack",
                    content: "<p>Use Precision Attack (cost 1 Superiority Die)?</p>",
                    buttons: {
                        one: {
                            icon: '<p> </p><img src = "icons/skills/targeting/crosshair-triple-strike-orange.webp" width="60" height="60"></>',
                            label: "<p>Yes</p>",
                            callback: () => resolve(true)
                        },
                        two: {
                            icon: '<p> </p><img src = "systems/dnd5e/icons/skills/weapon_28.jpg" width="60" height="60"></>',
                            label: "<p>No</p>",
                            callback: () => {resolve(false)}
                        }
                    },
                    default: "two"
                }).render(true);
            });
            useSuperiorityDie = await dialog;
        } else return;

        if (!useSuperiorityDie) return;

        // if YES subtract a superiorty die
        await decrimentSheetResource (pcActor, "Superiority Dice", 1);

        console.log("MACRO TEST | Workflow: %O", workflow);

        // get the live MIDI-QOL workflow so we can make changes
        let newRoll = new  Roll(`${workflow.attackRoll.result} + ${superiorityDie}`, workflow.actor.getRollData());
        newRoll = await newRoll.evaluate({ async: true });
        workflow.attackRoll = newRoll;
        workflow.attackRollTotal = newRoll.total;
        workflow.attackRollHTML = await workflow.attackRoll.render(newRoll);

        return;
    }
}
return;

//---------------------------------- MY FUNCTIONS -------------------------------------

// Test for available resource
// Return resource object
async function findSheetResource (testActor, resourceName) {
    let resources = Object.values(testActor.data.data.resources);
    let foundResource = resources.find(i => i.label.toLowerCase() === resourceName.toLowerCase());
    return foundResource;
}

// Decriment available resource
async function decrimentSheetResource (testActor, resourceName, numValue) {
    let actorDup = duplicate(testActor.data._source);
    let resources = Object.values(actorDup.data.resources);
    let foundResource = resources.find(i => i.label.toLowerCase() === resourceName.toLowerCase());
    foundResource.value = foundResource.value - numValue;
    await testActor.update(actorDup); 
    return;
}