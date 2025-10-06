Pod::Spec.new do |s|
  s.name           = 'StreamingMicrophone'
  s.version        = '1.0.0'
  s.summary        = 'Real-time streaming microphone module for Board Game Assistant'
  s.description    = 'Native iOS module for streaming microphone audio data in real-time using AVAudioEngine'
  s.author         = 'Board Game Assistant'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end