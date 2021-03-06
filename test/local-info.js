var chai = require('chai'),
      expect = chai.expect,
    childProcess = require('child_process'),
    localInfo = require('../lib/local-info'),
    path = require('path'),
    sinon = require('sinon');

describe('repo-state', function() {
  beforeEach(function() {
    this.sandbox = sinon.sandbox.create({
      injectInto: this,
      properties: ["spy", "stub"]
    });
  });
  afterEach(function() {
    this.sandbox.restore();
  });

  describe('#githubName', function() {
    it('should lookup local repo', function(done) {
      localInfo.githubName(__dirname, function(err, origin) {
        expect(origin).to.equal('walmartlabs/github-util');
        done();
      });
    });

    it('should select origin for multiple instances', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(undefined,
          'origin  git@github.com:kpdecker/github-util.git (fetch)\n'
          + 'origin  git@github.com:kpdecker/github-util.git (push)\n'
          + 'upstream  git@github.com:walmartlabs/github-util.git (fetch)\n'
          + 'upstream  git@github.com:walmartlabs/github-util.git (push)\n');
      });
      localInfo.githubName(__dirname, function(err, origin) {
        expect(origin).to.equal('kpdecker/github-util');
      });
    });

    it('should handle errors', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(new Error('It failed'));
      });

      var spy = this.spy();
      localInfo.githubName(__dirname, spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(new Error('It failed'))).to.be.true;
    });
  });

  describe('#firstCommit', function() {
    it('should lookup local repo', function(done) {
      localInfo.firstCommit(__dirname, function(err, first) {
        expect(first).to.equal('71f5fa4');
        done();
      });
    });

    it('should handle errors', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(new Error('It failed'));
      });

      var spy = this.spy();
      localInfo.firstCommit(__dirname, spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(new Error('It failed'))).to.be.true;
    });
  });

  describe('#commitTime', function() {
    it('should lookup local repo', function(done) {
      localInfo.commitTime(__dirname, '71f5fa4', function(err, time) {
        expect(time).to.equal('2013-12-27T05:38:34Z');
        done();
      });
    });

    it('should handle errors', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(new Error('It failed'));
      });

      var spy = this.spy();
      localInfo.commitTime(__dirname, 'asdf', spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(new Error('It failed'))).to.be.true;
    });
  });

  describe('#ensureClean', function() {
    it('should lookup local repo', function(done) {
      localInfo.ensureClean(__dirname, function(err, clean) {
        expect(clean).to.be.true;
        done();
      });
    });

    it('should handle dirty', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(undefined, ' ');
      });

      var spy = this.spy();
      localInfo.ensureClean(__dirname, spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(undefined, false)).to.be.true;
    });

    it('should handle errors', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(new Error('It failed'));
      });

      var spy = this.spy();
      localInfo.ensureClean(__dirname, spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(new Error('It failed'))).to.be.true;
    });
  });

  describe('#ensureFetched', function() {
    it('should handle fetched', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(undefined, '');
      });

      var spy = this.spy();
      localInfo.ensureFetched(__dirname, spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(undefined, true)).to.be.true;
    });

    it('should handle behind', function(done) {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(undefined, '[behind 5]');
      });

      localInfo.ensureFetched(__dirname, function(err, fetched, status) {
        expect(err).to.not.exist;
        expect(fetched).to.be.false;
        expect(status).to.eql({behind: '5'});
        done();
      });
    });

    it('should handle fetch errors', function(done) {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        process.nextTick(function() {
          callback(new Error('It failed'));
        });
        return {};
      });

      localInfo.ensureFetched('dir!', function(err, fetched, status) {
        expect(err).to.match(/git.fetch dir!: It failed/);
        done();
      });
    });

    it('should handle branch errors', function(done) {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        process.nextTick(function() {
          callback(/branch/.test(exec) && new Error('It failed'));
        });
        return {};
      });

      localInfo.ensureFetched('dir!', function(err, fetched, status) {
        expect(err).to.match(/git.fetch dir!: It failed/);
        done();
      });
    });

    it('should handle timeouts', function(done) {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        process.nextTick(function() {
          callback(new Error('It failed'));
        });
        return {killed: true};
      });

      localInfo.ensureFetched('dir!', function(err, fetched, status) {
        expect(err).to.match(/git.fetch dir!: It failed/);
        expect(err.killed).to.be.true;
        done();
      });
    });
  });

  describe('#status', function() {
    it('should not error for local dir', function(done) {
      localInfo.status(__dirname, function(err, status) {
        expect(err).to.not.exist;
        expect(status).to.exist;
        done();
      });
    });

    it('should return counts', function(done) {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(undefined, '?? foo\n M bar\nA? bar\nDM bar\n M bar\n C bar\n U bar\n');
      });

      var spy = this.spy();
      localInfo.status(__dirname, function(err, status) {
        expect(err).to.not.exist;
        expect(status).to.eql({added: 1, modified: 4, deleted: 1, untracked: 1});
        done();
      });
    });
    it('should handle errors', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(new Error('It failed'));
      });

      var spy = this.spy();
      localInfo.status('dir!', spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(new Error('git.status dir!: It failed'))).to.be.true;
    });
  });

  describe('#unmergedBranches', function() {
    it('should return empty for local dir', function(done) {
      localInfo.unmergedBranches(__dirname, function(err, unmerged) {
        expect(unmerged).to.eql([]);
        done();
      });
    });
    it('should return branch list', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(undefined, '  foo\n  bar\n');
      });

      var spy = this.spy();
      localInfo.unmergedBranches(__dirname, spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(undefined, ['foo', 'bar'])).to.be.true;
    });
    it('should handle other errors', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(/branch/.test(exec) && new Error('It failed'));
      });

      var spy = this.spy();
      localInfo.unmergedBranches(__dirname, spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(new Error('It failed'))).to.be.true;
    });
    it('should handle malformed object error', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(new Error('malformed object name HEAD'));
      });

      var spy = this.spy();
      localInfo.unmergedBranches(__dirname, spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(undefined, [])).to.be.true;
    });
  });

  describe('#stashes', function() {
    it('should not error for local dir', function(done) {
      localInfo.stashes(__dirname, function(err, stashes) {
        expect(err).to.not.exist;
        expect(stashes).to.be.a('number');
        done();
      });
    });

    it('should return counts', function(done) {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(undefined, 'foo\n bar\n');
      });

      var spy = this.spy();
      localInfo.stashes(__dirname, function(err, stashes) {
        expect(err).to.not.exist;
        expect(stashes).to.eql(2);
        done();
      });
    });
    it('should handle errors', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(new Error('It failed'));
      });

      var spy = this.spy();
      localInfo.stashes('dir!', spy);
      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(new Error('git.stashes dir!: It failed'))).to.be.true;
    });
  });

  describe('#isSubmodule', function() {
    it('should return false for local dir', function(done) {
      localInfo.isSubmodule(path.resolve(__dirname + '/..'), function(err, isSubmodule) {
        expect(isSubmodule).to.be.false;
        done();
      });
    });

    it('should return true', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(undefined, 'true');
      });

      var spy = this.spy();
      localInfo.isSubmodule('/foo/bar', spy);

      expect(childProcess.exec.calledWith(sinon.match(/git rev-parse/), {cwd: '/foo'})).to.be.true;
      expect(spy.calledWith(undefined, true)).to.be.true;
    });

    it('should handle errors', function() {
      this.stub(childProcess, 'exec', function(exec, options, callback) {
        callback(new Error('It failed'));
      });

      var spy = this.spy();
      localInfo.isSubmodule('/foo/bar', spy);

      expect(spy.callCount).to.equal(1);
      expect(spy.calledWith(undefined, false)).to.be.true;
    });
  });
});
