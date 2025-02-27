class MetronomeAudio {

    static MIN_TEMPO = 30;
    static MAX_TEMPO = 300;

    // Private fields
    #audioContext;
    #nextNoteTime = 0;
    #scheduleAheadTime = 0.1;   // How far ahead to schedule audio (seconds)
    #lookahead = 25.0;          // How frequently to call scheduling function (milliseconds)
    #currentBeat = 0;
    #tempo = 120;
    #isPlaying = false;
    #timerID = null;
    #beatCallback = null;
    #timeSignatureId = '4';    // Default time signature
    #timeSignatureBeats = 4;    // Number of beats in this time signature
    #beatPatterns = {
        '1': [1],                  // 1/4
        '2': [1, 0],               // 2/4
        '3': [1, 0, 0],           // 3/4
        '4': [1, 0, 0, 0],        // 4/4 
        '5': [1, 0, 0, 0, 0],     // 5/4
        '5S': [1, 0, 2, 0, 0],     // 5/4 (1 = strong, 2 = medium, 0 = weak)
        '6': [1, 0, 0, 0, 0, 0],  // 6/8
        '6S': [1, 0, 0, 2, 0, 0],  // 6/8 (1 = strong, 2 = medium, 0 = weak)
        '7': [1, 0, 0, 0, 0, 0, 0], // 7/8
        '7S': [1, 0, 2, 0, 2, 0, 0], // 7/8 (1 = strong, 2 = medium, 0 = weak)
        '9': [1, 0, 0, 0, 0, 0, 0, 0, 0], // 9/8
        '9S': [1, 0, 0, 2, 0, 0, 2, 0, 0], // 9/8
        '12': [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 12/8
        '12S': [1, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0] // 12/8
    };

    constructor(audioContext) {
        this.#audioContext = audioContext;
    }

    // Private methods (internal implementation details)
    #nextNote() {
        // Calculate time for next note
        const secondsPerBeat = 60.0 / this.#tempo;
        this.#nextNoteTime += secondsPerBeat;
        this.#currentBeat = (this.#currentBeat + 1) % this.#timeSignatureBeats;
    }

    #scheduleNote(beatNumber, time) {
        // Create oscillator for the click sound
        const oscillator = this.#audioContext.createOscillator();
        const envelope = this.#audioContext.createGain();
        
        // Get the beat pattern for current time signature
        const pattern = this.#beatPatterns[this.timeSignatureId];
        const beatType = pattern[beatNumber];

        // Set frequency based on beat type
        switch (beatType) {
            case 1: oscillator.frequency.value = 880.0; break; // Strong beat (A5)
            case 2: oscillator.frequency.value = 660.0; break; // Medium beat (E5)
            default: oscillator.frequency.value = 440.0;       // Weak beat (A4)
        }

        // Create an ADSR envelope for the click sound
        envelope.gain.value = 1.0;
        envelope.gain.exponentialRampToValueAtTime(1.0, time + 0.001);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

        oscillator.connect(envelope);
        envelope.connect(this.#audioContext.destination);

        oscillator.start(time);
        oscillator.stop(time + 0.03);

        // Clean up oscillator and envelope nodes after they stop
        oscillator.onended = () => {
            oscillator.disconnect();
            envelope.disconnect();
        };

        this.#scheduleVisualUpdate(beatNumber, time);
    }

    #scheduleVisualUpdate(beatNumber, time) {
        const drawTime = time - this.#audioContext.currentTime;
        setTimeout(() => {
            if (this.#beatCallback) {
                this.#beatCallback(beatNumber);
            }
        }, drawTime * 1000);
    }

    #scheduler() {
        while (this.#nextNoteTime < this.#audioContext.currentTime + this.#scheduleAheadTime) {
            this.#scheduleNote(this.#currentBeat, this.#nextNoteTime);
            this.#nextNote();
        }
        this.#timerID = window.setTimeout(() => this.#scheduler(), this.#lookahead);
    }

    // Public API
    get tempo() {
        return this.#tempo;
    }

    get isPlaying() {
        return this.#isPlaying;
    }

    get timeSignatureId() {
        return this.#timeSignatureId;
    }

    get beatPatterns() {
        return { ...this.#beatPatterns }; // Return a copy to prevent modification
    }

    start() {
        if (this.#isPlaying) return;

        this.#isPlaying = true;
        this.#currentBeat = 0;
        this.#nextNoteTime = this.#audioContext.currentTime;
        this.#scheduler();
    }

    stop() {
        this.#isPlaying = false;
        window.clearTimeout(this.#timerID);
        if (this.#beatCallback) {
            this.#beatCallback(-1); // Signal to clear all beat indicators
        }
    }

    /**
     * Sets the tempo to a new value within the allowed range.
     *
     * @param {number} newTempo - The new tempo value to set.
     * @returns {number} The updated tempo value.
     */
    setTempo(newTempo) {
        this.#tempo = Math.min(Math.max(newTempo, MetronomeAudio.MIN_TEMPO), MetronomeAudio.MAX_TEMPO);
        return this.#tempo;
    }

    setBeatCallback(callback) {
        this.#beatCallback = callback;
    }

    setTimeSignature(timeSignatureId) {
        if (this.#timeSignatureId === timeSignatureId) return;
        if (this.#beatPatterns[timeSignatureId]) {
            this.#timeSignatureId = timeSignatureId;
            this.#timeSignatureBeats = this.#beatPatterns[timeSignatureId].length;
            this.#currentBeat = 0; // Reset beat counter when changing time signature
        }
    }
}

export default MetronomeAudio;
