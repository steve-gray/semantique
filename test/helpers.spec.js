// NPM Dependencies
const chai = require('chai');

// Internal Dependencies
const helpers = require('../lib/helpers');

// Globals
const expect = chai.expect;

describe('Helpers', () => {
  describe('getDecorationTags', () => {
    it('Should return expected tag text (singular)', () => {
      expect(helpers.getDecorationTags('tag: v1.0.0'))
        .to.deep.eql(['1.0.0']);
    });

    it('Should return expected tag text (ignore non-semver)', () => {
      expect(helpers.getDecorationTags('tag: foo, tag: v1.0.0, tag: foo'))
        .to.deep.eql(['1.0.0']);
    });

    it('Should return expected tag text (ignore brackets)', () => {
      expect(helpers.getDecorationTags('(tag: foo, tag: v1.0.0, tag: foo)'))
        .to.deep.eql(['1.0.0']);
    });
  });
});
