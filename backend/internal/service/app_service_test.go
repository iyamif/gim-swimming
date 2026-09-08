package service

import (
	"testing"
)

func TestFormatIndonesianDate(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"2026-09-09", "Rabu, 09 Sep 2026"},
		{"2026-10-01", "Kamis, 01 Okt 2026"},
		{"2026-12-25", "Jumat, 25 Des 2026"},
		{"", ""},
		{"Rabu, 09 Sep 2026", "Rabu, 09 Sep 2026"},
	}

	for _, c := range cases {
		result := formatIndonesianDate(c.input)
		if result != c.expected {
			t.Errorf("formatIndonesianDate(%q) = %q; want %q", c.input, result, c.expected)
		}
	}
}

func TestValidateScheduleDuration(t *testing.T) {
	tests := []struct {
		name      string
		class     string
		timeStart string
		timeEnd   string
		expectErr bool
	}{
		// Kids / Baby - 30 minutes
		{"Kids Valid 30 mins", "Kids Swimming", "15:00", "15:30", false},
		{"Kids Valid Morning", "Kids Swimming", "08:00", "08:30", false},
		{"Kids Invalid 60 mins", "Kids Swimming", "15:00", "16:00", true},

		// Prestasi - 2 hours 30 mins (150 mins)
		{"Prestasi Valid 15:00-17:30", "Prestasi", "15:00", "17:30", false},
		{"Prestasi Invalid 60 mins", "Prestasi", "15:00", "16:00", true},
		{"Prestasi Invalid 2 hours", "Prestasi", "15:00", "17:00", true},

		// Private Class - 60 minutes (1 hour)
		{"Private Valid 60 mins", "Private Class", "15:00", "16:00", false},
		{"Private Valid Morning", "Private Class", "08:00", "09:00", false},
		{"Private Invalid 30 mins", "Private Class", "15:00", "15:30", true},

		// End before start
		{"Invalid End Before Start", "Private Class", "16:00", "15:00", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateScheduleDuration(tt.class, tt.timeStart, tt.timeEnd)
			if (err != nil) != tt.expectErr {
				t.Errorf("validateScheduleDuration(%q, %q, %q) error = %v, expectErr = %v",
					tt.class, tt.timeStart, tt.timeEnd, err, tt.expectErr)
			}
		})
	}
}

func TestValidateSingleStudentSchedule(t *testing.T) {
	tests := []struct {
		name       string
		class      string
		studentIDs []string
		expectErr  bool
	}{
		{"Kids 1 Student", "Kids Swimming", []string{"1"}, false},
		{"Kids 0 Student", "Kids Swimming", []string{}, false},
		{"Kids 2 Students", "Kids Swimming", []string{"1", "2"}, true},

		{"Private 1 Student", "Private Class", []string{"1"}, false},
		{"Private 2 Students", "Private Class", []string{"1", "2"}, true},

		{"Prestasi 1 Student", "Prestasi", []string{"1"}, false},
		{"Prestasi 3 Students", "Prestasi", []string{"1", "2", "3"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSingleStudentSchedule(tt.class, tt.studentIDs)
			if (err != nil) != tt.expectErr {
				t.Errorf("validateSingleStudentSchedule(%q, %v) error = %v, expectErr = %v",
					tt.class, tt.studentIDs, err, tt.expectErr)
			}
		})
	}
}
