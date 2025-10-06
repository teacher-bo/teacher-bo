package expo.modules.streamingmicrophone

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.concurrent.thread

val BUFFERS_PER_SECOND = 15
val SAMPLE_RATE = 44100

class StreamingMicrophoneModule : Module() {

    private var audioRecord: AudioRecord? = null
    private var isCurrentlyRecording = false
    private val bufferSize = maxOf(
        SAMPLE_RATE / BUFFERS_PER_SECOND,
        AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
    )

    override fun definition() = ModuleDefinition {
        Name("StreamingMicrophone")

        Events("onAudioBuffer", "onAudioChunk")

        Constants(
            "BUFFERS_PER_SECOND" to BUFFERS_PER_SECOND,
            "SAMPLE_RATE" to SAMPLE_RATE
        )

        Function("startRecording") {
            startRecording()
        }

        Function("stopRecording") {
            stopRecording()
        }
        
        Function("isRecording") { ->
            isCurrentlyRecording
        }

        Function("getSampleRate") { -> 
            SAMPLE_RATE.toDouble()
        }
        
        Function("getBufferSize") { ->
            bufferSize
        }
    }

    private fun startRecording() {
        if (isCurrentlyRecording) {
            println("Already recording, ignoring start request")
            return
        }

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                println("AudioRecord initialization failed")
                return
            }

            isCurrentlyRecording = true
            audioRecord?.startRecording()
            
            println("Started streaming microphone recording - Sample Rate: ${SAMPLE_RATE}Hz, Buffer Size: $bufferSize")

            thread {
                val buffer = ShortArray(bufferSize)
                while (isCurrentlyRecording) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        // Convert to float samples normalized to [-1, 1]
                        val floatBuffer = buffer.take(read).map { it / 32768.0f }
                        val timestamp = System.currentTimeMillis()
                        
                        // Send audio buffer event
                        sendEvent("onAudioBuffer", mapOf(
                            "samples" to floatBuffer
                        ))
                        
                        // Send audio chunk event with additional metadata
                        sendEvent("onAudioChunk", mapOf(
                            "data" to floatBuffer,
                            "timestamp" to timestamp,
                            "sampleRate" to SAMPLE_RATE
                        ))
                    }
                }
            }
        } catch (e: Exception) {
            println("Error starting microphone recording: ${e.message}")
            isCurrentlyRecording = false
        }
    }

    private fun stopRecording() {
        if (!isCurrentlyRecording) {
            println("Not recording, ignoring stop request")
            return
        }
        
        println("Stopping streaming microphone recording")
        isCurrentlyRecording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }
}