class NoiseGateActivator {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.oscillator = null;
    this.gainNode = null;
    this.isActive = false;
  }

  activate() {
    if (this.isActive) return;

    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.frequency.setValueAtTime(30, this.audioContext.currentTime);
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(0.001, this.audioContext.currentTime);
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    this.oscillator.start();
    this.isActive = true;
  }

  deactivate() {
    if (!this.isActive) return;

    this.oscillator.stop();
    this.oscillator.disconnect();
    this.oscillator = null;
    this.isActive = false;
  }

  toggle(isPlaying) {
    if (!isPlaying || this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }
}

export default NoiseGateActivator;
