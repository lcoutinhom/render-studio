require "spec_helper"
require "tmpdir"
require "rbconfig"
require "open3"
load File.expand_path("../../bin/dev", __dir__)

RSpec.describe DevSupervisor do
  def alive?(pid)
    Process.kill(0, pid)
    true
  rescue Errno::ESRCH
    false
  end

  def wait_for_file(path)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + 5
    until File.exist?(path)
      raise "Child did not start" if Process.clock_gettime(Process::CLOCK_MONOTONIC) >= deadline
      sleep 0.05
    end
  end

  it "returns a failed service's exit code and terminates the other service" do
    Dir.mktmpdir do |directory|
      marker = File.join(directory, "child.pid")
      services = { "failure" => [RbConfig.ruby, "-e", "sleep 0.3; exit 7"],
        "waiting" => [RbConfig.ruby, "-e", "File.write(ARGV[0], Process.pid); sleep 30", marker] }
      supervisor = described_class.new(services: services, log_directory: directory, shutdown_timeout: 1)
      expect(supervisor.run).to eq(7)
      expect(alive?(Integer(File.read(marker)))).to be(false)
    end
  end

  it "handles TERM and stops its child without affecting another process" do
    Dir.mktmpdir do |directory|
      marker = File.join(directory, "child.pid")
      unrelated = Process.spawn(RbConfig.ruby, "-e", "sleep 30", out: File::NULL, err: File::NULL)
      code = <<~CODE
        load ARGV[0]
        services = { "waiting" => [RbConfig.ruby, "-e", "File.write(ARGV[0], Process.pid); sleep 30", ARGV[1]] }
        exit DevSupervisor.new(services: services, log_directory: ARGV[2], shutdown_timeout: 1).run
      CODE
      parent = Process.spawn(RbConfig.ruby, "-r", "rbconfig", "-e", code,
        File.expand_path("../../bin/dev", __dir__), marker, directory, out: File::NULL, err: File::NULL)
      wait_for_file(marker)
      child = Integer(File.read(marker))
      Process.kill("TERM", parent)
      _, status = Process.waitpid2(parent)
      expect(status.exitstatus).to eq(0)
      expect(alive?(child)).to be(false)
      expect(alive?(unrelated)).to be(true)
    ensure
      [parent, unrelated].compact.each do |pid|
        Process.kill("TERM", pid) rescue Errno::ESRCH
        Process.waitpid(pid) rescue Errno::ECHILD
      end
    end
  end
end
