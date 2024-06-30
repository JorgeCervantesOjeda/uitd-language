export function generateWebAppFromUITDL( parsedData ) {
    const html = generateHTML( parsedData );
    const scripts = generateScripts( parsedData );

    return [
        { name: 'index.html', content: html },
        { name: 'scripts.js', content: scripts }
    ];
}

function generateHTML( parsedData ) {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${parsedData.name}</title>
    <style>
        .hidden { display: none; }
    </style>
</head>
<body>
    <div id="app">`;

    parsedData.uis.forEach( ui => {
        html += `
        <div id="${ui.id}" class="ui hidden">
            <h2>${ui.name}</h2>`;
        ui.actions.forEach( action => {
            html += `
            <button onclick="transition('${ui.id}', '${action.verb} ${action.target}')">${action.target}</button>`;
        } );
        html += `
        </div>`;
    } );

    html += `
    </div>
    <script src="scripts.js"></script>
</body>
</html>`;

    return html;
}

function generateScripts( parsedData ) {
    const transitions = generateTransitions( parsedData );
    const conditions = generateConditions( parsedData );
    const mainScript = generateMainScript( parsedData );

    return `${transitions}\n${conditions}\n${mainScript}`;
}

function generateTransitions( parsedData ) {
    const transitions = [];

    parsedData.fragments.forEach( fragment => {
        fragment.transitions.forEach( transition => {
            const action = `${transition.action} ${transition.target}`;
            const condition = { condition: transition.condition, destinationTrue: transition.to, destinationFalse: '' };
            const existing = transitions.find( t => t.origin === transition.from );
            if( existing ) {
                const actionExists = existing.actions.find( a => a.action === action );
                if( actionExists ) {
                    actionExists.conditions.push( condition );
                } else {
                    existing.actions.push( { action, conditions: [ condition ] } );
                }
            } else {
                transitions.push( {
                    origin: transition.from,
                    actions: [ { action, conditions: [ condition ] } ]
                } );
            }
        } );
    } );

    return `const transitions = ${JSON.stringify( transitions, null, 4 )};`;
}

function generateConditions( parsedData ) {
    const conditions = new Set();
    parsedData.fragments.forEach( fragment => {
        fragment.transitions.forEach( transition => {
            conditions.add( transition.condition );
        } );
    } );

    let conditionsScript = '';
    conditions.forEach( condition => {
        conditionsScript += `
function ${condition}(data) {
    return askUserCondition("${condition}");
}
        `;
    } );

    conditionsScript += `
function askUserCondition(question) {
    return new Promise((resolve) => {
        const conditionModal = document.createElement('div');
        conditionModal.classList.add('condition-modal');

        const questionText = document.createElement('p');
        questionText.textContent = question;

        const trueButton = document.createElement('button');
        trueButton.textContent = 'True';
        trueButton.onclick = () => {
            resolve(true);
            document.body.removeChild(conditionModal);
        };

        const falseButton = document.createElement('button');
        falseButton.textContent = 'False';
        falseButton.onclick = () => {
            resolve(false);
            document.body.removeChild(conditionModal);
        };

        conditionModal.appendChild(questionText);
        conditionModal.appendChild(trueButton);
        conditionModal.appendChild(falseButton);

        document.body.appendChild(conditionModal);
    });
}
    `;

    return conditionsScript;
}

function generateMainScript( parsedData ) {
    return `
async function transition(origin, action) {
    console.log(\`Transition triggered from UI \${origin} with action \${action}\`);
    const originData = collectUIData(origin);
    console.log("Collected data:", originData);

    const originTransitions = transitions.find(t => t.origin === origin);
    if (originTransitions) {
        const actionTransitions = originTransitions.actions.find(a => a.action === action);
        if (actionTransitions) {
            for (const conditionObj of actionTransitions.conditions) {
                console.log(\`Evaluating condition for action \${action} in UI \${origin}\`);
                const conditionMet = await conditionObj.condition(originData);
                console.log(\`Condition met: \${conditionMet}\`);
                const destination = conditionMet ? conditionObj.destinationTrue : conditionObj.destinationFalse;
                if (destination) {
                    const uis = document.querySelectorAll('.ui');
                    uis.forEach(ui => ui.classList.add('hidden'));
                    playBeep();
                    showUI(destination);
                    return;
                }
            }
        }
    }
}

function collectUIData(uiId) {
    const uiElement = document.getElementById(uiId);
    const inputs = uiElement.querySelectorAll('input, select, textarea');
    const data = {};

    inputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            data[input.name] = input.checked;
        } else {
            data[input.name] = input.value;
        }
    });

    return data;
}

function showUI(uiId) {
    document.getElementById(uiId).classList.remove('hidden');
    if (nestedUIs[uiId]) {
        nestedUIs[uiId].forEach(nestedUI => {
            showUI(nestedUI);
        });
    }
}

function playBeep() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

document.addEventListener('DOMContentLoaded', () => {
    showUI('3');
});
    `;
}
