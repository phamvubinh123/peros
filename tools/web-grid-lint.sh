#!/usr/bin/env bash
# Flags spacing numbers in docs/styles.css and docs/app.js that are off the 4px grid.
# Allowed numbers for spacing/sizing/radius: 0, 1, 2, 99, 999, and multiples of 4.
# Usage: tools/web-grid-lint.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/docs"

perl -ne '
  BEGIN { $count = 0 }
  if (!/grid:\s*ok/) {
    my @bad;
    while (/(?:padding(?:-(?:top|bottom|left|right))?|margin(?:-(?:top|bottom|left|right))?|gap|border-radius)\s*:\s*([^;"\n]+)/g) {
      my $val = $1;
      while ($val =~ /(-?\d+(?:\.\d+)?)px/g) {
        my $n = $1;
        push @bad, "${n}px" unless $n == 0 || $n == 1 || $n == 2 || $n == 99 || $n == 999 || ($n == int($n) && $n % 4 == 0);
      }
    }
    if (@bad) {
      $count++;
      my $l = $_;
      $l =~ s/^\s+//;
      print "$ARGV:$.: off 4px grid (", join(", ", @bad), "): $l";
    }
  }
  close ARGV if eof;
  END {
    if ($count) {
      print "FAIL web-grid-lint: $count lines off the 4px grid\n";
      exit 1;
    }
    print "PASS web-grid-lint\n";
  }
' "$DIR/styles.css" "$DIR/app.js"
