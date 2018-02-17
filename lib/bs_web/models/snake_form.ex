defmodule BsWeb.SnakeForm do
  @derive {Poison.Encoder, only: [:url]}

  use BsWeb, :model

  embedded_schema do
    field(:url)
    field(:name)
    field(:delete, :boolean, virtual: true)
  end

  def validate_name_field(changeset) do
    name = get_change(changeset, :name)
    url = get_change(changeset, :url)

    case name == nil and url == nil do
      true ->
        changeset

      false ->
        case name != nil and url != nil do
          true ->
            changeset

          false ->
            if name == nil do
              add_error(changeset, :name, "Name is required.")
            else
              add_error(changeset, :url, "URL is required.")
            end
        end
    end
  end

  def changeset(snake, params \\ %{}) do
    snake
    |> cast(params, [:url, :name, :delete])
    |> validate_name_field()
  end
end
