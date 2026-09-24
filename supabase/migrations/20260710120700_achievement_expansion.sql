insert into public.achievements (name, description, icon_url, xp_reward, condition_type, condition_value)
values
  ('Coin Collector', 'Earn 100 coins from study activities.', '🪙', 100, 'coins_earned', 100),
  ('League Climber', 'Earn 500 XP in a weekly league.', '📈', 150, 'weekly_xp', 500),
  ('Boss Breaker', 'Win your first weekly boss quiz.', '👑', 200, 'boss_quiz_wins', 1),
  ('Boss Champion', 'Win 5 weekly boss quizzes.', '🏆', 500, 'boss_quiz_wins', 5),
  ('Portfolio Ready', 'Reach level 5 and show your study profile.', '🎓', 150, 'xp_total', 4000),
  ('Momentum Master', 'Earn 1500 XP in one league week.', '⚡', 300, 'weekly_xp', 1500)
on conflict do nothing;
