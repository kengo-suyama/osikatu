<?php

return [
    'custom' => [
        'diary' => [
            'oshi_id' => [
                'required' => '推しを選んでね',
                'integer' => '推しの指定が不正です',
                'exists' => '推しが見つからないよ',
            ],
            'title' => [
                'required' => 'タイトルを入力してね',
                'string' => 'タイトルは文字で入力してね',
                'max' => 'タイトルは1〜50文字で入力してね',
            ],
            'content' => [
                'required' => '本文を入力してね',
                'string' => '本文は文字で入力してね',
            ],
            'diary_date' => [
                'required' => '日付を選んでね',
                'date' => '正しい日付を選んでね',
            ],
            'is_locked' => [
                'boolean' => 'ロック設定が不正です',
            ],
        ],
        'expense' => [
            'oshi_id' => [
                'required' => '推しを選んでね',
                'integer' => '推しの指定が不正です',
                'exists' => '推しが見つからないよ',
            ],
            'category' => [
                'required' => 'カテゴリを入力してね',
                'string' => 'カテゴリは文字で入力してね',
                'max' => 'カテゴリは1〜30文字で入力してね',
            ],
            'amount' => [
                'required' => '金額を入力してね',
                'integer' => '0以上の数字を入れてね',
                'min' => '0以上の数字を入れてね',
            ],
            'expense_date' => [
                'required' => '日付を選んでね',
                'date' => '正しい日付を選んでね',
            ],
            'memo' => [
                'string' => 'メモは文字で入力してね',
                'max' => 'メモは200文字以内で入力してね',
            ],
        ],
        'schedule' => [
            'oshi_id' => [
                'required' => '推しを選んでね',
                'integer' => '推しの指定が不正です',
                'exists' => '推しが見つからないよ',
            ],
            'title' => [
                'required' => 'タイトルを入力してね',
                'string' => 'タイトルは文字で入力してね',
                'max' => 'タイトルは1〜50文字で入力してね',
            ],
            'description' => [
                'string' => '説明は文字で入力してね',
                'max' => '説明は200文字以内で入力してね',
            ],
            'start_datetime' => [
                'required' => '開始日時を選んでね',
                'date' => '開始日時を正しく選んでね',
            ],
            'end_datetime' => [
                'date' => '終了日時を正しく選んでね',
                'after' => '終了は開始より後にしてね',
            ],
            'notify_before_minutes' => [
                'integer' => '通知は数字で入力してね',
                'min' => '通知は0〜1440分で選んでね',
                'max' => '通知は0〜1440分で選んでね',
            ],
        ],
    ],
    'attributes' => [
        'diary' => [
            'oshi_id' => '推し',
            'title' => 'タイトル',
            'content' => '本文',
            'diary_date' => '日付',
            'is_locked' => 'ロック',
        ],
        'expense' => [
            'oshi_id' => '推し',
            'category' => 'カテゴリ',
            'amount' => '金額',
            'expense_date' => '日付',
            'memo' => 'メモ',
        ],
        'schedule' => [
            'oshi_id' => '推し',
            'title' => 'タイトル',
            'description' => '説明',
            'start_datetime' => '開始日時',
            'end_datetime' => '終了日時',
            'notify_before_minutes' => '通知',
        ],
    ],
];
