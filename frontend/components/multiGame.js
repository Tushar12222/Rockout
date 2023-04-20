import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { useRouter } from "next/router";
import ShareButton from './shareButton'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorPage from "next/error";
import Image from "next/image";
let socket;

const multiGame = () => {
    const router = useRouter()

    const [playerChoice, setPlayerChoice] = useState(null)
    const [opponentChoice, setOpponentChoice] = useState(null)
    const [playerScore, setPlayerScore] = useState(0)
    const [opponentScore, setOpponentScore] = useState(0)
    const [currentRound, setCurrentRound] = useState(1)
    const [winner, setWinner] = useState(null)
    const [numPlayersReady, setNumPlayersReady] = useState(0);
    const [disabled, setDisabled] = useState(false)
    const [totalRounds, setTotalRounds] = useState(5)
    const [playerName, setPlayerName] = useState(null)
    const [opponentName, setOpponentName] = useState("Waiting...")
    const [isBothPlayers, setIsBothPlayers] = useState(false)
    const { rounds, name, action, slug } = router.query

    // Initialize socket connection
    useEffect(() => {
        socketInitializer();
        return () => {
            if (socket) {
                socket.disconnect();
                socket.destroy();
            }
        };
    }, []);

    useEffect(() => {
        // Check if rounds are completed
        if (currentRound > totalRounds) {
            let finalResultDiv = document.getElementById('finalResultDiv')
            let finalResulText = document.getElementById('finalResultText')
            let container = document.getElementById('container')

            if (playerScore > opponentScore) {
                container.style.display = 'none'
                finalResultDiv.style.display = 'flex'
                finalResulText.innerText = `${playerName} Won!`
                finalResulText.style.color = 'green'
                setDisabled(true)
                return;
            }
            if (opponentScore > playerScore) {
                container.style.display = 'none'
                finalResultDiv.style.display = 'flex'
                finalResulText.innerText = `${opponentName} Won!`
                finalResulText.style.color = 'red'
                setDisabled(true)
                return;
            }
        }
    }, [currentRound])

    useEffect(() => {
        if (playerChoice && opponentChoice) {
            
            // Determine winner based on user and opponent choice
            const determineWinner = () => {
                if (playerChoice && opponentChoice) {
                    if (playerChoice === opponentChoice) {
                        setWinner('Tie');
                    } else if (
                        (playerChoice === 'rock' && opponentChoice === 'scissors') ||
                        (playerChoice === 'paper' && opponentChoice === 'rock') ||
                        (playerChoice === 'scissors' && opponentChoice === 'paper')
                    ) {
                        setWinner(`${playerName} wins!`);
                        setPlayerScore((prevScore) => prevScore + 1);
                        setCurrentRound((prevRound) => prevRound + 1);
                    } else {
                        setWinner(`${opponentName} wins!`);
                        setOpponentScore((prevScore) => prevScore + 1);
                        setCurrentRound((prevRound) => prevRound + 1);
                    }
                }
            };

            determineWinner();
        }
    }, [playerChoice, opponentChoice])


    // Initialize socket connection
    const socketInitializer = async () => {
        await fetch('/api/socket')
        socket = io('https://rockout.vercel.app')

        let isSocketInitialized = false;

        // Check if socket is connected to server
        socket.on('connect', () => {
            console.log('connected')
            console.log(socket.id)
            isSocketInitialized = true;
        })

        // Listen for update-choices event
        socket.on('update-choices', (choice1, choice2, id) => {
            console.log(choice1)
            console.log(choice2)
            if (id !== socket.id) {
                setOpponentChoice(choice2);
            } else {
                setOpponentChoice(choice1)
            }
        });

        // Listen for start-game event
        socket.on('start-game', (playerName, ownerName, rounds, id) => {
            let loadingBar = document.getElementById('loadingBar');
            let outerMostDiv = document.getElementById('outerMostDiv');

            loadingBar.classList.add('hidden')
            outerMostDiv.classList.remove('hidden')
            
            if (id !== socket.id) {
                setOpponentName(playerName)
            }
            if (id == socket.id) {
                setOpponentName(ownerName)
                setTotalRounds(rounds)
            }
            setIsBothPlayers(true);
            console.log('Startgame has been fired')
            console.log(playerName + ' ' + id)
        })

        // listen for room-not-found event
        socket.on('room-not-found', () => {
            let loadingBar = document.getElementById('loadingBar')
            let errorPage = document.getElementById('errorPage')

            loadingBar.classList.add('hidden')
            errorPage.classList.remove('hidden')
        })

        // listen for room-found event
        socket.on('room-found', ()=>{
            let loadingBar = document.getElementById('loadingBar');
            let outerMostDiv = document.getElementById('outerMostDiv');

            loadingBar.classList.add('hidden')
            outerMostDiv.classList.remove('hidden')
        })

        const interval = setInterval(() => {
            // Check if socket is initialized
            if (isSocketInitialized) {
                clearInterval(interval);

                if (action == 'create') {
                    if (name && rounds) {
                        setPlayerName(name)
                        setTotalRounds(rounds)
                        socket.emit('room-has-created', slug, name, rounds, socket.id)
                    }
                }
                else {
                    socket.emit('player-has-joined', slug, name, socket.id)
                    setPlayerName(name)
                }
            }
        }, 500);
    }

    // Reset the game after declaring round winner
    useEffect(() => {
        if (winner) {
            setTimeout(() => {
                setPlayerChoice(null);
                setOpponentChoice(null);
                setWinner(null);
                setNumPlayersReady(0);
                setDisabled(false);
            }, 3000);
        }
    }, [winner]);

    // Handle player choice
    const handleplayerChoice = (choice) => {
        if (!isBothPlayers) {
            toast.error("Wait for another player to join", {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });

            return;
        }

        if (currentRound > totalRounds) {
            setDisabled(true)
            return;
        }

        console.log('called')
        setPlayerChoice(choice);
        socket.emit("player-choice", choice, socket.id, slug);
        setNumPlayersReady(numPlayersReady + 1);
        setDisabled(true)
        socket.emit('message')
    };


    return (
        <>
            <div id="errorPage" className="hidden">
                <ErrorPage title="This room does not exist anymore" statusCode={404} />
            </div>

            <div id="loadingBar" className="h-[100vh] w-[100%] flex justify-center items-center">
                <Image src={'/loading-load.gif'} height={200} width={200} />
            </div>

            <div id="outerMostDiv" className="hidden">
                <div className="flex flex-col justify-center items-center mt-28">
                    <ShareButton roomId={slug} />
                    <ToastContainer
                        position="top-right"
                        autoClose={3000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="dark"
                    />
                    <div className="border-2 border-black dark:border-white border-solid h-60 w-[80%] flex flex-col mt-5">
                        <div id="container">
                            <div className="flex justify-center mt-3">
                                <h1 className="font-bold text-4xl">Round {currentRound}</h1>
                            </div>
                            <div className="flex justify-between items-center w-[100%] mt-4">
                                <div className="ml-5">
                                    <p className="font-bold text-3xl">{playerName}</p>
                                    <div className="flex justify-center">
                                        <p className="mt-3 font-bold text-green-600 text-5xl">{playerScore}</p>
                                    </div>
                                </div>
                                <div className="mr-5">
                                    <p className="font-bold text-3xl">{opponentName}</p>
                                    <div className="flex justify-center">
                                        <p className="mt-3 font-bold text-green-600 text-5xl">{opponentScore}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="finalResultDiv" className="h-[100%] w-[100%] hidden justify-center items-center">
                            <h1 id="finalResultText" className="text-4xl">Initial</h1>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center mt-8">
                    <h1 className="text-3xl font-bold mb-8">Rock Paper Scissors</h1>
                    <div className="flex">
                        <button className="bg-gray-200 hover:bg-gray-300 text-xl font-bold py-4 px-8 rounded-md mr-4 hover:animate-pulse dark:text-black" disabled={disabled} onClick={() => handleplayerChoice('rock')}>
                            Rock
                        </button>
                        <button className="bg-gray-200 hover:bg-gray-300 text-xl font-bold py-4 px-8 rounded-md mr-4 dark:text-black" disabled={disabled} onClick={() => handleplayerChoice('paper')}>
                            Paper
                        </button>
                        <button className="bg-gray-200 hover:bg-gray-300 text-xl font-bold py-4 px-8 rounded-md mr-4 dark:text-black" disabled={disabled} onClick={() => handleplayerChoice('scissors')}>
                            Scissors
                        </button>
                    </div>
                    <div className="flex flex-col items-center mt-8">
                        <p className="text-2xl font-bold">You chose: {playerChoice}</p>
                        <p className="text-2xl font-bold">Opponent chose: {opponentChoice}</p>
                        <p className="text-3xl font-bold mt-4">{winner}</p>
                    </div>
                </div>
            </div>
        </>
    )
}

export default multiGame