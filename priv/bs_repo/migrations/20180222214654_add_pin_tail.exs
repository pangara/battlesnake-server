defmodule BsRepo.Migrations.AddPinTail do
  use Ecto.Migration

  def change do
    alter table(BsRepo.GameForm) do
      add(:pin_tail, :any)
    end

    alter table(:bs_repo_game) do
      add(:pin_tail, :any)
    end
  end
end
