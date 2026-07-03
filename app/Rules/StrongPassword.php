<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StrongPassword implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $password = (string) $value;

        $isLongEnough = strlen($password) >= 15;

        $isComplexEnough =
            strlen($password) >= 8 &&
            preg_match('/[a-z]/', $password) &&
            preg_match('/[0-9]/', $password);

        if (!($isLongEnough || $isComplexEnough)) {
            // Pesan mengikuti bahasa aktif (lang/{locale}/validation.php)
            $fail(__('validation.custom.password.strong'));
        }
    }
}
