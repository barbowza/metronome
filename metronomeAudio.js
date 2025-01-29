class MetronomeAudio {

    static MIN_TEMPO = 30;
    static MAX_TEMPO = 300;

    constructor(audioContext) {
        this.audioContext = audioContext;
        this.nextNoteTime = 0;
        this.scheduleAheadTime = 0.1;   // How far ahead to schedule audio (seconds)
        this.lookahead = 25.0;          // How frequently to call scheduling function (milliseconds)
        this.currentBeat = 0;
        this.tempo = 120;
        this.isPlaying = false;
        this.timerID = null;
        this.beatCallback = null;
        this.timeSignatureId = '4';    // Default time signature
        this.timeSignatureBeats = 4;    // Number of beats in this time signature
        this.beatPatterns = {
            '1': [1],                  // 1/4
            '2': [1, 0],               // 2/4
            '3': [1, 0, 0],           // 3/4
            '4': [1, 0, 0, 0],        // 4/4 
            '5': [1, 0, 2, 0, 0],     // 5/4 (1 = strong, 2 = medium, 0 = weak)
            '6': [1, 0, 0, 2, 0, 0],  // 6/8
            '7': [1, 0, 2, 0, 2, 0, 0], // 7/8
            '9': [1, 0, 0, 2, 0, 0, 2, 0, 0], // 9/8
            '12': [1, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0] // 12/8
        };
    }

    nextNote() {
        // Calculate time for next note
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += secondsPerBeat;
        this.currentBeat = (this.currentBeat + 1) % this.timeSignatureBeats;
    }

    scheduleNote(beatNumber, time) {
        // Create oscillator for the click sound
        const oscillator = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();

        // Get the beat pattern for current time signature
        const pattern = this.beatPatterns[this.timeSignatureId];
        const beatType = pattern[beatNumber];

        // Set frequency based on beat type
        switch (beatType) {
            case 1: // Strong beat
                oscillator.frequency.value = 880.0;
                break;
            case 2: // Medium beat
                oscillator.frequency.value = 660.0;
                break;
            default: // Weak beat
                oscillator.frequency.value = 440.0;
        }

        envelope.gain.value = 1.0;
        envelope.gain.exponentialRampToValueAtTime(1.0, time + 0.001);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

        oscillator.connect(envelope);
        envelope.connect(this.audioContext.destination);

        oscillator.start(time);
        oscillator.stop(time + 0.03);

        // Clean up oscillator and envelope nodes after they stop
        oscillator.onended = () => {
            oscillator.disconnect();
            envelope.disconnect();
        };

        this.scheduleVisualUpdate(beatNumber, time);
    }

    scheduleVisualUpdate(beatNumber, time) {
        const drawTime = time - this.audioContext.currentTime;
        setTimeout(() => {
            if (this.beatCallback) {
                this.beatCallback(beatNumber);
            }
        }, drawTime * 1000);
    }

    scheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.nextNoteTime);
            this.nextNote();
        }
        this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }

    start() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.currentBeat = 0;
        this.nextNoteTime = this.audioContext.currentTime;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        window.clearTimeout(this.timerID);
        if (this.beatCallback) {
            this.beatCallback(-1); // Signal to clear all beat indicators
        }
    }

    /**
     * Sets the tempo to a new value within the allowed range.
     *
     * @param {number} newTempo - The new tempo value to set.
     * @returns {number} The updated tempo value.
     */
    setTempo(newTempo) {
        this.tempo = Math.min(Math.max(newTempo, MetronomeAudio.MIN_TEMPO), MetronomeAudio.MAX_TEMPO);
        return this.tempo;
    }

    setBeatCallback(callback) {
        this.beatCallback = callback;
    }

    setTimeSignature(timeSignatureId) {
        if (this.timeSignatureId === timeSignatureId) return;
        if (this.beatPatterns[timeSignatureId]) {
            this.timeSignatureId = timeSignatureId;
            this.timeSignatureBeats = this.beatPatterns[timeSignatureId].length;
            this.currentBeat = 0; // Reset beat counter when changing time signature
        }
    }
}

export default MetronomeAudio;
