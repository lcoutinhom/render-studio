module Rendering
  module Adapters
    class Simulation
      class Failure < StandardError; end
      def initialize(sleeper: ->(seconds) { sleep(seconds) }, step_seconds: nil)
        @sleeper = sleeper
        @step_seconds = (step_seconds || ENV.fetch("SIMULATION_STEP_SECONDS", "0.75").to_f).clamp(0, 5)
      end
      # Adapter contract: immutable input plus cooperative progress callback. No original files are executed or changed.
      def call(snapshot:, fail_first_attempt:, attempt:)
        [ 10, 25, 45, 65, 85, 95 ].each do |progress|
          @sleeper.call(@step_seconds)
          return false unless yield(progress)
          raise Failure, "controlled simulation failure" if fail_first_attempt && attempt == 1 && progress == 45
        end
        true
      end
    end
  end
end
