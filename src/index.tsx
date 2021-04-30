import React, { useState, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { useArrayState } from "react-use-object-state";
import Swal from 'sweetalert2';
import 'core-js/stable';
import { Howl } from 'howler';


function getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

const correctSound = new Howl({
    src: ['correct.mp3']
});

const incorrectSound = new Howl({
    src: ['incorrect.mp3']
});

const powerupSound = new Howl({
    src: ['powerup.mp3']
});

const youWinSound = new Howl({
    src: ['youwin.mp3']
});



const questionSide = "definitions";
const answerSide = "terms";

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
 function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function selectAnswers(currentQuestionIndex: number): string[] {
    let answers = [];
    answers.push((window as any)[answerSide][currentQuestionIndex]);
    let foundIndexes = [];
    for(let i = 0; i < Math.min(3, (window as any)[answerSide].length - 1); i++) {
        let index = 0;
        do {
            index = getRandomIntInclusive(0, (window as any)[answerSide].length - 1);
        } while(index == currentQuestionIndex || foundIndexes.indexOf(index) != -1);
        foundIndexes.push(index);
        answers.push((window as any)[answerSide][index]);
    }
    shuffle(answers);
    return answers;
}

enum GameState {
    ANSWERING_QUESTIONS,
    FINISHED_QUESTIONS,
    USING_LIFELINE,
    FAILED
}

enum Lifeline {
    ASK_THE_AUDIENCE,
    FIFTY_FIFTY,
    DOUBLE_DIP,
    JUMP_THE_QUESTION
}

function formatCurrency(num: number) {
    if(typeof num != 'number')
        return "---";
    return "$" + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
const MAX_QUESTIONS = 5;
const questionValues = [
    100,
    200,
    300,
    500,
    1000,
    2000,
    4000,
    8000,
    16000,
    32000,
    64000,
    125000,
    250000,
    500000,
    1000000
]

function getParameterByName( name ){
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    let regexS = "[\\?&]"+name+"=([^&#]*)";
    let regex = new RegExp( regexS );
    let results = regex.exec( window.location.href );
    if( results == null )
      return "";
    else
      return decodeURIComponent(results[1].replace(/\+/g, " "));
}

async function askAudience(options: string[], correctAnswer: string) {
    await Swal.fire({
        title: 'Ask the Audience',
        text: 'The audience is voting...',
        imageUrl: 'ripple.gif',
        showConfirmButton: false,
        allowOutsideClick: false,
        timer: 5000,
        timerProgressBar: true
    });
    let audienceCorrect = Math.random();
    let audienceIncorrectUnanimity = Math.random();
    let audienceChoices = [];
    for(let i = 0; i < options.length; i++) {
        audienceChoices[i] = 0;
    }
    let correctIndex = options.indexOf(correctAnswer);
    let incorrectIndex;
    do {
        incorrectIndex = getRandomIntInclusive(0, options.length - 1);
    } while(incorrectIndex == correctIndex);
    const AUDIENCE_NUM = getRandomIntInclusive(10, 500);
    for(let i = 0; i < AUDIENCE_NUM; i++) {
        let chosenIndex;
        if(Math.random() <= audienceCorrect) {
            chosenIndex = correctIndex;
        } else {
            if(Math.random() <= audienceIncorrectUnanimity) {
                 chosenIndex = incorrectIndex;
            } else {
                do {
                    chosenIndex = getRandomIntInclusive(0, options.length - 1);
                } while(chosenIndex == correctIndex);
            }
        }
        audienceChoices[chosenIndex]++;
    }
    const voteDivs = audienceChoices.map((num, i) => {
        const percent = (num / AUDIENCE_NUM) * 100;
        return `<tr><td class="fitwidth">${options[i]}</td><td><div class="vote-tally-bar" style="width: ${percent}%;">${Math.round(percent)}%</div></td></tr>`;
    })
    await Swal.fire({
        title: 'Ask the Audience',
        html: `<p>Your audience size: ${AUDIENCE_NUM}</p>
        <table class="vote-tally">
            ${voteDivs.join("")}
        </table>
        `,
        showConfirmButton: true,
        allowOutsideClick: true,
    });
}

function LifelineButton(props: { children: any; disabled?: boolean; lifeline: Lifeline; onClick: (l: Lifeline) => void; usedList: Lifeline[]; }) {
    const onClick = () => {
        props.onClick(props.lifeline);
    };
    return <button
        disabled={props.usedList.indexOf(props.lifeline) != -1 || (props.disabled === true)}
        className="question-answer-button"
        onClick={onClick}>
            {props.children}
    </button>;
}

function openLifelineGuide(e) {
    e.preventDefault();
    Swal.fire({
        title: 'Lifelines',
        html: `
        <p>Lifelines can be used to help you answer a tough question. They can each only be used once.</p>
        <p>Additionally, the 50:50 lifeline cannot be used after Double Dip is activated for a question. Use them in
        the opposite order if you wish to do this.</p>
        <p>The available lifelines are:</p>
        <ul class="lifeline-list">
            <li><strong>Double Dip</strong>: Gives you two tries on a question. This does not carry over to the next question.</li>
            <li><strong>50:50</strong>: Removes two of the incorrect answers, leaving you with a 50% chance of getting the question right.</li>
            <li><strong>Ask the Audience</strong>: Have the (virtual) audience vote on what answer is correct. They may or may not be right.</li>
            <li><strong>Jump the Question</strong>: Skip a question entirely.</li>
        </ul>
        `
    })
}
function App() {
    const [ currentGameState, setCurrentGameState ] = useState(GameState.ANSWERING_QUESTIONS);
    const [ scriptProcessed, setScriptProcessed ] = useState(false);
    const [ currentQuestionIndex, setCurrentQuestionIndex ] = useState(0);
    const [ currentMoney, setCurrentMoney ] = useState(0);
    const [ answers, setAnswers ] = useState(null);
    const [ activeLifeline, setActiveLifeline ] = useState<Lifeline>(null);
    const [ doubleDippedAnswer, setDoubleDippedAnswer ] = useState(null);
    const [ protectedDoubleDip, setProtectedDoubleDip ] = useState(false);
    const usedLifelineTypes = useArrayState<Lifeline>([]);
    const questionValue = questionValues[currentQuestionIndex];
    const answerSideArray = (window as any)[answerSide];
    const correctAnswer = typeof answerSideArray != 'undefined' ? answerSideArray[currentQuestionIndex] : false;
    const clearLifeline = () => {
        setActiveLifeline(null);
    }
    const onAnswerClick = (answer) => {
        const isCorrect = (correctAnswer == answer);
        if(isCorrect)
            correctSound.play();
        else
            incorrectSound.play();

        if(isCorrect) {
            setCurrentMoney(questionValue);
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else if(protectedDoubleDip) {
            setDoubleDippedAnswer(answer);
            setProtectedDoubleDip(false);
            Swal.fire({
                title: 'Double Dip',
                text: "Oops.. that wasn't the right answer! Fortunately, you get a chance to try again."
            });
        } else {
            setCurrentGameState(GameState.FAILED);
        }
    };
    const useLifeline = (lifeline: Lifeline) => {
        setActiveLifeline(lifeline);
    };
    const playAgain = () => {
        setCurrentQuestionIndex(0);
        setCurrentGameState(GameState.ANSWERING_QUESTIONS);
        setCurrentMoney(0);
        setProtectedDoubleDip(false);
        setDoubleDippedAnswer(null);
        usedLifelineTypes.setState([]);
    };
    useEffect(() => {
        setDoubleDippedAnswer(null);
        setProtectedDoubleDip(false);
    }, [ currentQuestionIndex ]);
    useEffect(() => {
        if(activeLifeline != null) {
            usedLifelineTypes.push(activeLifeline);
            powerupSound.play();
            switch(activeLifeline) {
                case Lifeline.ASK_THE_AUDIENCE:
                    askAudience(answers, correctAnswer).then(clearLifeline);
                    break;
                case Lifeline.JUMP_THE_QUESTION:
                    setCurrentQuestionIndex(currentQuestionIndex+1);
                    Swal.fire({title: 'Jump the Question', text: 'You have skipped that question!'}).then(clearLifeline);
                    break;
                case Lifeline.FIFTY_FIFTY:
                    setAnswers(shuffle([ answers.filter(answer => correctAnswer != answer)[0], correctAnswer ]));
                    Swal.fire({title: '50:50', text: 'Two incorrect answers were removed! You now have a 50% chance of getting this right if you guess.'}).then(clearLifeline);
                    break;
                case Lifeline.DOUBLE_DIP:
                    setProtectedDoubleDip(true);
                    Swal.fire({title: 'Double Dip', text: 'If you get this question wrong, you will be given another chance to answer.'}).then(clearLifeline);
                    break;
            }
        }
    }, [ activeLifeline ]);
    useEffect(() => {
        if(currentGameState == GameState.ANSWERING_QUESTIONS && scriptProcessed) {
            if(currentQuestionIndex < Math.min((window as any)[questionSide].length, MAX_QUESTIONS)) {
                setAnswers(selectAnswers(currentQuestionIndex));
            } else {
                youWinSound.play();
                setCurrentGameState(GameState.FINISHED_QUESTIONS);
            }
        }
    }, [ currentQuestionIndex, scriptProcessed, currentGameState ]);
    useEffect(() => {
        const src = getParameterByName("quizscript");
        if(src == null) {
            Swal.fire({
                title: 'Error',
                text: "A source script must be provided in the 'quizscript' parameter.",
                icon: "error"
            });
        } else {
            const script = document.createElement("script");
            script.onload = () => setScriptProcessed(true);

            script.src = src;
            script.async = true;
        
            document.body.appendChild(script);
        }
        
    }, []);
    let mainApp = null;
    if(activeLifeline != null) {
        return null;
    } else if(currentGameState == GameState.FAILED) {
        return <>
            <h3>Uh oh! That wasn't the right answer.</h3>
            <h4>Your total earnings are: <b>{formatCurrency(currentMoney)}</b></h4>
            <button className="question-answer-button" onClick={playAgain}>Play again</button>
        </>;
    } else if(currentGameState == GameState.FINISHED_QUESTIONS) {
        return <>
            <h3>Congratulations! You are now a millionaire!</h3>
            <p></p>
            <img className="decoration-image" src="moneybag.png"/>
        </>;
    }
    if(scriptProcessed) {
        mainApp = <>
            <h2>Who Wants To Be A Millionaire?</h2>
            <table className="question-value">
                <thead>
                    <tr>
                        <th scope="col">YOUR MONEY</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {/*<td>{formatCurrency(questionValue)}</td>*/}
                        <td>{formatCurrency(currentMoney)}</td>
                    </tr>
                </tbody>

            </table>
            <div className="question-term">
                {(window as any)[questionSide][currentQuestionIndex]}
            </div>
            <div className="question-options">
                {answers?.map(answer => <button disabled={doubleDippedAnswer == answer} key={answer} className="question-answer-button" onClick={onAnswerClick.bind(void 0, answer)}>{answer}</button>)}
            </div>
            <p></p>
            <p></p>
            <h4>Having trouble? Click one of the buttons below to use a lifeline.</h4>
            <div className="lifeline-options">
                <LifelineButton usedList={usedLifelineTypes.state} lifeline={Lifeline.ASK_THE_AUDIENCE} onClick={useLifeline}>Ask the Audience</LifelineButton>
                <LifelineButton disabled={protectedDoubleDip || doubleDippedAnswer != null} usedList={usedLifelineTypes.state} lifeline={Lifeline.FIFTY_FIFTY} onClick={useLifeline}>50:50</LifelineButton>
                <LifelineButton usedList={usedLifelineTypes.state} lifeline={Lifeline.DOUBLE_DIP} onClick={useLifeline}>Double Dip</LifelineButton>
                <LifelineButton usedList={usedLifelineTypes.state} lifeline={Lifeline.JUMP_THE_QUESTION} onClick={useLifeline}>Jump The Question</LifelineButton>
            </div>
            <p></p>
            <a href="#" onClick={openLifelineGuide}>Lifeline Guide</a>
        </>;
    }
    return <>
        {mainApp}
    </>;
}

ReactDOM.render(<App/>, document.getElementById("game-container"));