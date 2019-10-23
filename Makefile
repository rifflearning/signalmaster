#
# Makefile to build and test the signalmaster
#   duplicates (and should be kept in sync with) some of the scripts in package.json
#

GIT_TAG_VERSION = $(shell git describe)

COMPILER = ./node_modules/.bin/tsc
LINT = ./node_modules/.bin/eslint
MOCHA = ./node_modules/.bin/mocha

LINT_LOG = logs/lint.log
TEST_LOG = logs/test.log

# Add --quiet to only report on errors, not warnings
LINT_OPTIONS =
LINT_FORMAT = stylish

.DEFAULT_GOAL := help
.DELETE_ON_ERROR :
.PHONY : help all init install build doc test clean clean-build lint lint-log vim-lint

all : lint build test ## run lint, build, test

init : install build ## run install, build; intended for initializing a fresh repo clone

install : ## run npm install
	npm install

build : ## currently does nothing
	@echo "build converts source files to runnable files (eg compiles, links, minimizes)"
	@echo "signalmaster source files are run as is at this time, so no processing is needed."

doc : ## currently does nothing
	@echo "doc creates usable documentation files (eg extracts/compiles doc in source code)"
	@echo "signalmaster does not have any extractable or buildable documentation at this time."

lint-log : LINT_OPTIONS = --output-file $(LINT_LOG) ## run lint concise diffable output to $(LINT_LOG)
lint-log : LINT_FORMAT = unix
vim-lint : LINT_FORMAT = unix ## run lint in format consumable by vim quickfix
lint : ## (NOT IMPLEMENTED YET) run lint over the sources & tests; display results to stdout
lint vim-lint lint-log :
	$(LINT) $(LINT_OPTIONS) --format $(LINT_FORMAT) src test

test : ## run the tests defined in package.json
	npm run test

clean : clean-build ## remove all files created by build

clean-build :


# Help documentation à la https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
# if you want the help sorted rather than in the order of occurrence, pipe the grep to sort and pipe that to awk
help : ## this help documentation (extracted from comments on the targets)
	@echo ""                                            ; \
	echo "Useful targets in this signalmaster Makefile:" ; \
	(grep -E '^[a-zA-Z_-]+ ?:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = " ?:.*?## "}; {printf "\033[36m%-12s\033[0m : %s\n", $$1, $$2}') ; \
	echo ""

