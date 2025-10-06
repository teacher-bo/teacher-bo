import AVFoundation
import ExpoModulesCore

let BUFFERS_PER_SECOND = 15
let SAMPLE_RATE = 44100

public class StreamingMicrophoneModule: Module {

  private let audioSession = AVAudioSession.sharedInstance()
  private let audioEngine = AVAudioEngine()
  private var isCurrentlyRecording = false

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('StreamingMicrophone')` in JavaScript.
    Name("StreamingMicrophone")

    // Defines event names that the module can send to JavaScript.
    Events("onAudioBuffer", "onAudioChunk")

    Constants([
      "BUFFERS_PER_SECOND": BUFFERS_PER_SECOND,
      "SAMPLE_RATE": SAMPLE_RATE
    ])

    Function("startRecording") {
      self.startRecording()
    }

    Function("stopRecording") {
      self.stopRecording()
    }

    Function("isRecording") { () -> Bool in
      return self.isCurrentlyRecording
    }

    Function("getSampleRate") { () -> Double in
      // Requires initializing inputNode before retrieving sampleRate
      return self.audioEngine.inputNode.inputFormat(forBus: 0).sampleRate
    }
    
    Function("getBufferSize") { () -> Int in
      return SAMPLE_RATE / BUFFERS_PER_SECOND
    }
  }

  private func startRecording() {
    if isCurrentlyRecording {
      print("Already recording, ignoring start request")
      return
    }

    // Request microphone permission
    self.audioSession.requestRecordPermission { granted in
        guard granted else {
            print("Microphone permission not granted.")
            return
        }

        print("Configuring audioSession for streaming microphone")
        DispatchQueue.main.async {
            do {
                try self.audioSession.setCategory(.record, mode: .measurement, options: [])
                try self.audioSession.setActive(true)

                let inputNode = self.audioEngine.inputNode
                let hwFormat = inputNode.inputFormat(forBus: 0)
                let bufferSize = AVAudioFrameCount(self.audioSession.sampleRate / Double(BUFFERS_PER_SECOND))

                print("Audio session configured - Sample Rate: \(self.audioSession.sampleRate)Hz, Buffer Size: \(bufferSize)")
                
                inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: hwFormat) { buffer, _ in
                    guard let channelData = buffer.floatChannelData else { return }
                    let frameLength = Int(buffer.frameLength)
                    let samples = Array(UnsafeBufferPointer(start: channelData[0], count: frameLength))
                    
                    // Send audio buffer event
                    self.sendEvent("onAudioBuffer", [
                        "samples": samples
                    ])
                    
                    // Send audio chunk event with additional metadata
                    self.sendEvent("onAudioChunk", [
                        "data": samples,
                        "timestamp": Date().timeIntervalSince1970 * 1000, // milliseconds
                        "sampleRate": self.audioSession.sampleRate
                    ])
                }

                try self.audioEngine.start()
                self.isCurrentlyRecording = true
                print("Started streaming microphone recording")
            } catch {
                print("Error configuring audio engine: \(error.localizedDescription)")
            }
        }
    }
  }

  private func stopRecording() {
    if !isCurrentlyRecording {
      print("Not recording, ignoring stop request")
      return
    }
    
    print("Stopping streaming microphone recording")
    audioEngine.inputNode.removeTap(onBus: 0)
    audioEngine.stop()
    try? AVAudioSession.sharedInstance().setActive(false)
    isCurrentlyRecording = false
  }
}